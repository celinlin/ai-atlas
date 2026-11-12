import "server-only";
import postgres from "postgres";
import { buildDemoArticles } from "@/data/demo";
import { countryByCode } from "@/lib/geo/countries";
import { rangeBounds } from "@/lib/query";
import { INDUSTRIES } from "@/lib/taxonomy";
import type {
  Article, ArticleQuery, ContentType, CountryActivity, CountryProfile, IndustrySlug, IngestionJob, Page, PulseStats, SearchResults, TrendingTopic,
} from "@/lib/types";
import { titleFingerprint } from "@/lib/classify/dedupe";
import { StaticView } from "./memory-view";
import type { DataStatus, Repository, StatsFilter } from "./repository";

type Sql = ReturnType<typeof postgres>;
type Row = Record<string, unknown>;

function toArticle(r: Row): Article {
  const s = r.source_json as Row;
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    summary: r.summary as string,
    summarySource: r.summary_source as Article["summarySource"],
    url: r.url as string,
    canonicalUrl: r.canonical_url as string,
    imageUrl: (r.image_url as string) ?? null,
    language: r.language as string,
    publishedAt: new Date(r.published_at as string).toISOString(),
    ingestedAt: new Date(r.ingested_at as string).toISOString(),
    source: { id: s.id as string, name: s.name as string, url: s.url as string, country: (s.country as string)?.trim() || null, kind: s.kind as Article["source"]["kind"], reliability: Number(s.reliability) },
    countries: (r.countries_json as Article["countries"]).map((c) => ({ ...c, code: c.code.trim() })),
    industries: r.industry_slugs as IndustrySlug[],
    contentType: r.content_type as ContentType,
    topics: r.topic_slugs as string[],
    organizations: r.organization_names as string[],
    quality: Number(r.quality),
    coverage: Number(r.coverage),
    status: r.status as Article["status"],
    trace: r.trace as Article["trace"],
    isDemo: r.is_demo as boolean,
  };
}

export class PgRepository implements Repository {
  readonly backend = "postgres" as const;
  private sql: Sql;
  private demo = new StaticView(() => buildDemoArticles());
  private demoCache: { at: number; value: boolean } | null = null;

  constructor(url: string) {
    this.sql = postgres(url, { max: Number(process.env.PG_POOL_SIZE || 5), idle_timeout: 20, prepare: !/pooler|:6543/.test(url) });
  }

  /** Serve labelled demo content only while the database holds no real articles. */
  private async useDemo(): Promise<boolean> {
    const mode = process.env.DEMO_MODE ?? "auto";
    if (mode === "off") return false;
    if (mode === "on") return true;
    if (this.demoCache && Date.now() - this.demoCache.at < 30_000) return this.demoCache.value;
    const [{ n }] = await this.sql<{ n: number }[]>`select count(*)::int as n from (select 1 from articles where not is_demo limit 1) x`;
    this.demoCache = { at: Date.now(), value: n === 0 };
    return n === 0;
  }

  async status(): Promise<DataStatus> {
    const [{ n }] = await this.sql<{ n: number }[]>`select count(*)::int as n from articles where not is_demo`;
    const [job] = await this.sql<{ finished_at: Date }[]>`select finished_at from ingestion_jobs where finished_at is not null order by finished_at desc limit 1`;
    const mode = process.env.DEMO_MODE ?? "auto";
    return { backend: "postgres", demo: mode === "on" || (mode !== "off" && n === 0), realArticles: n, lastIngestAt: job?.finished_at?.toISOString() ?? null };
  }

  /** WHERE clause shared by list and aggregate queries (alias `a`). */
  private where(q: ArticleQuery) {
    const sql = this.sql;
    const { from, to } = rangeBounds(q);
    const parts = [sql`not a.is_demo`];
    if (from) parts.push(sql`a.published_at >= ${from}`);
    if (to) parts.push(sql`a.published_at <= ${to}`);
    if (q.countries?.length) parts.push(sql`exists (select 1 from article_countries ac where ac.article_id = a.id and ac.role = 'event' and ac.country_code = any(${q.countries}::text[]))`);
    if (q.regions?.length) parts.push(sql`exists (select 1 from article_countries ac join countries c on c.code = ac.country_code where ac.article_id = a.id and ac.role = 'event' and c.region = any(${q.regions}::text[]))`);
    if (q.globalOnly) parts.push(sql`not exists (select 1 from article_countries ac where ac.article_id = a.id and ac.role = 'event')`);
    if (q.industries?.length) parts.push(sql`exists (select 1 from article_industries ai where ai.article_id = a.id and ai.industry_slug = any(${q.industries}::text[]))`);
    if (q.types?.length) parts.push(sql`a.content_type = any(${q.types}::text[])`);
    if (q.topics?.length) parts.push(sql`exists (select 1 from article_topics t where t.article_id = a.id and t.topic_slug = any(${q.topics}::text[]))`);
    if (q.organization) parts.push(sql`exists (select 1 from article_organizations ao join organizations o on o.id = ao.organization_id where ao.article_id = a.id and lower(o.name) = lower(${q.organization}))`);
    if (q.excludeIds?.length) parts.push(sql`a.id <> all(${q.excludeIds}::text[])`);
    if (q.q) parts.push(sql`(a.search @@ websearch_to_tsquery('simple', public.atlas_unaccent(${q.q})) or a.title ilike ${"%" + q.q + "%"})`);
    return parts.reduce((acc, p) => sql`${acc} and ${p}`);
  }

  private orderBy(sort: ArticleQuery["sort"]) {
    const sql = this.sql;
    if (sort === "top")
      return sql`order by (0.35 * a.quality + 0.35 * power(0.5, extract(epoch from (now() - a.published_at)) / 3600 / 36) + 0.15 * least(1, log(2, 1 + a.coverage) / 3) + 0.15 * (a.source_json->>'reliability')::real) desc`;
    return sql`order by a.published_at desc`;
  }

  async listArticles(q: ArticleQuery): Promise<Page<Article>> {
    if (await this.useDemo()) return this.demo.listArticles(q);
    const rows = await this.sql`select a.*, count(*) over() as total from article_full a where ${this.where(q)} ${this.orderBy(q.sort)} limit ${q.limit ?? 20} offset ${q.offset ?? 0}`;
    return { items: rows.map(toArticle), total: rows.length ? Number(rows[0].total) : 0 };
  }

  async getArticle(slugOrId: string) {
    if (await this.useDemo()) return this.demo.getArticle(slugOrId);
    const [r] = await this.sql`select * from article_full where slug = ${slugOrId} or id = ${slugOrId} limit 1`;
    return r ? toArticle(r) : null;
  }

  async getArticlesByIds(ids: string[]) {
    if (!ids.length) return [];
    if (await this.useDemo()) return this.demo.getArticlesByIds(ids);
    return (await this.sql`select * from article_full where id = any(${ids}::text[])`).map(toArticle);
  }

  async related(article: Article, limit = 4) {
    if (await this.useDemo()) return this.demo.related(article, limit);
    const ev = article.countries.filter((c) => c.role === "event").map((c) => c.code);
    const inds = article.industries.filter((i) => i !== "general");
    const rows = await this.sql`
      select a.*, (
        3 * (select count(*) from article_countries ac where ac.article_id = a.id and ac.role = 'event' and ac.country_code = any(${ev}::text[])) +
        2 * (select count(*) from article_industries ai where ai.article_id = a.id and ai.industry_slug = any(${inds}::text[])) +
        1.5 * (select count(*) from article_topics t where t.article_id = a.id and t.topic_slug = any(${article.topics}::text[])) +
        3 * (select count(*) from article_organizations ao join organizations o on o.id = ao.organization_id where ao.article_id = a.id and o.name = any(${article.organizations}::text[]))
      ) as score
      from article_full a where a.id <> ${article.id} and not a.is_demo and a.published_at > now() - interval '60 days'
      order by score desc, a.published_at desc limit ${limit * 3}`;
    return rows.filter((r) => Number(r.score) >= 2.5).slice(0, limit).map(toArticle);
  }

  async countryActivity(f: StatsFilter = {}): Promise<CountryActivity[]> {
    if (await this.useDemo()) return this.demo.countryActivity(f);
    const rows = await this.sql`
      with base as (select a.id, a.published_at from article_full a where ${this.where(f)}),
      ev as (select ac.country_code as code, b.id, b.published_at from base b join article_countries ac on ac.article_id = b.id and ac.role = 'event'),
      ind as (select ev.code, ai.industry_slug, count(*) as n, row_number() over (partition by ev.code order by count(*) desc) as rk
              from ev join article_industries ai on ai.article_id = ev.id group by ev.code, ai.industry_slug)
      select ev.code, count(*)::int as count, max(ev.published_at) as latest,
        coalesce((select jsonb_agg(jsonb_build_object('slug', ind.industry_slug, 'count', ind.n) order by ind.n desc) from ind where ind.code = ev.code and ind.rk <= 3), '[]') as industries
      from ev group by ev.code order by count desc`;
    return rows.map((r) => ({ code: (r.code as string).trim(), count: r.count as number, latestAt: r.latest ? new Date(r.latest as string).toISOString() : null, industries: r.industries as CountryActivity["industries"] }));
  }

  async countryProfile(code: string, f: StatsFilter = {}): Promise<CountryProfile> {
    if (await this.useDemo()) return this.demo.countryProfile(code, f);
    const w = this.where({ ...f, countries: [code] });
    const sql = this.sql;
    const [[{ total }], industries, types, orgs, topics, daily] = await Promise.all([
      sql<{ total: number }[]>`select count(*)::int as total from article_full a where ${w}`,
      sql`select ai.industry_slug as slug, count(*)::int as count from article_full a join article_industries ai on ai.article_id = a.id where ${w} group by 1 order by 2 desc`,
      sql`select a.content_type as slug, count(*)::int as count from article_full a where ${w} group by 1 order by 2 desc`,
      sql`select o.name, count(*)::int as count from article_full a join article_organizations ao on ao.article_id = a.id join organizations o on o.id = ao.organization_id where ${w} group by 1 order by 2 desc limit 8`,
      sql`select t.topic_slug as topic, count(*)::int as count from article_full a join article_topics t on t.article_id = a.id where ${w} group by 1 order by 2 desc limit 8`,
      sql`select to_char(d, 'YYYY-MM-DD') as day, (select count(*)::int from articles a join article_countries ac on ac.article_id = a.id and ac.role = 'event' and ac.country_code = ${code}
            where not a.is_demo and a.published_at >= d and a.published_at < d + interval '1 day') as count
          from generate_series(date_trunc('day', now() at time zone 'utc') - interval '29 days', date_trunc('day', now() at time zone 'utc'), interval '1 day') d`,
    ]);
    return {
      code, total,
      industries: industries as unknown as CountryProfile["industries"],
      types: types as unknown as CountryProfile["types"],
      organizations: orgs as unknown as CountryProfile["organizations"],
      topics: topics as unknown as CountryProfile["topics"],
      daily: daily as unknown as CountryProfile["daily"],
    };
  }

  async industryStats(f: StatsFilter = {}) {
    if (await this.useDemo()) return this.demo.industryStats(f);
    const w = this.where({ ...f, industries: undefined });
    const rows = await this.sql`
      select ai.industry_slug as slug, count(distinct a.id)::int as count,
        count(distinct ac.country_code)::int as countries,
        array(select (select count(*)::int from articles a2 join article_industries ai2 on ai2.article_id = a2.id and ai2.industry_slug = ai.industry_slug
                      where not a2.is_demo and a2.published_at >= d and a2.published_at < d + interval '1 day')
              from generate_series(date_trunc('day', now() at time zone 'utc') - interval '13 days', date_trunc('day', now() at time zone 'utc'), interval '1 day') d) as daily
      from article_full a join article_industries ai on ai.article_id = a.id
      left join article_countries ac on ac.article_id = a.id and ac.role = 'event'
      where ${w} group by ai.industry_slug`;
    const by = new Map(rows.map((r) => [r.slug as string, r]));
    return INDUSTRIES.map((i) => {
      const r = by.get(i.slug);
      return { slug: i.slug, count: (r?.count as number) ?? 0, countries: (r?.countries as number) ?? 0, daily: (r?.daily as number[]) ?? Array(14).fill(0) };
    }).sort((a, b) => b.count - a.count);
  }

  async pulse(): Promise<PulseStats> {
    if (await this.useDemo()) return this.demo.pulse();
    const sql = this.sql;
    const [[c], daily, inds, types, status] = await Promise.all([
      sql`select count(*) filter (where published_at > now() - interval '24 hours')::int as d1, count(*) filter (where published_at > now() - interval '7 days')::int as d7,
            (select count(distinct ac.country_code)::int from article_countries ac join articles a on a.id = ac.article_id where ac.role = 'event' and not a.is_demo and a.published_at > now() - interval '7 days') as countries,
            (select count(distinct source_id)::int from articles where not is_demo) as sources
          from articles where not is_demo`,
      sql`select to_char(d, 'YYYY-MM-DD') as day, (select count(*)::int from articles a where not a.is_demo and a.published_at >= d and a.published_at < d + interval '1 day') as count
          from generate_series(date_trunc('day', now() at time zone 'utc') - interval '13 days', date_trunc('day', now() at time zone 'utc'), interval '1 day') d`,
      sql`select ai.industry_slug as slug, count(*)::int as count from articles a join article_industries ai on ai.article_id = a.id where not a.is_demo and a.published_at > now() - interval '7 days' group by 1 order by 2 desc limit 6`,
      sql`select content_type as slug, count(*)::int as count from articles where not is_demo and published_at > now() - interval '7 days' group by 1 order by 2 desc limit 6`,
      this.status(),
    ]);
    return {
      articles24h: c.d1, articles7d: c.d7, activeCountries: c.countries, sources: c.sources,
      daily: daily as unknown as PulseStats["daily"],
      topIndustries: inds as unknown as PulseStats["topIndustries"],
      topTypes: types as unknown as PulseStats["topTypes"],
      lastIngestAt: status.lastIngestAt,
    };
  }

  async trendingTopics(limit = 8): Promise<TrendingTopic[]> {
    if (await this.useDemo()) return this.demo.trendingTopics(limit);
    const rows = await this.sql`
      select t.topic_slug as topic,
        count(*) filter (where a.published_at > now() - interval '7 days')::int as cur,
        count(*) filter (where a.published_at <= now() - interval '7 days')::int as prev
      from articles a join article_topics t on t.article_id = a.id
      where not a.is_demo and a.published_at > now() - interval '14 days'
      group by 1 having count(*) filter (where a.published_at > now() - interval '7 days') > 0
      order by cur desc limit ${limit}`;
    return rows.map((r) => ({ topic: r.topic as string, count: r.cur as number, delta: ((r.cur as number) - (r.prev as number)) / Math.max(1, r.prev as number) }));
  }

  async search(q: string, limit = 20): Promise<SearchResults> {
    if (await this.useDemo()) return this.demo.search(q, limit);
    const needle = q.trim();
    if (!needle) return { articles: [], countries: [], organizations: [], topics: [], industries: [] };
    const like = `%${needle}%`;
    const [articles, orgs, topics] = await Promise.all([
      this.listArticles({ q: needle, sort: "top", limit }),
      this.sql`select o.name, count(*)::int as count from organizations o join article_organizations ao on ao.organization_id = o.id where o.name ilike ${like} group by 1 order by 2 desc limit 6`,
      this.sql`select t.slug as topic, count(at.article_id)::int as count from topics t left join article_topics at on at.topic_slug = t.slug where t.name_en ilike ${like} or t.name_fr ilike ${like} group by 1 order by 2 desc limit 6`,
    ]);
    const n = needle.toLowerCase();
    return {
      articles: articles.items,
      countries: [...countryByCode.values()].filter((c) => c.en.toLowerCase().includes(n) || c.fr.toLowerCase().includes(n) || c.code.toLowerCase() === n).slice(0, 6).map((c) => c.code),
      organizations: orgs as unknown as SearchResults["organizations"],
      topics: topics as unknown as SearchResults["topics"],
      industries: INDUSTRIES.filter((i) => i.en.toLowerCase().includes(n) || i.fr.toLowerCase().includes(n)).map((i) => i.slug),
    };
  }

  // ---------- ingestion ----------
  async existingCanonicalUrls(urls: string[]) {
    if (!urls.length) return new Set<string>();
    const rows = await this.sql<{ canonical_url: string }[]>`select canonical_url from articles where canonical_url = any(${urls}::text[])`;
    return new Set(rows.map((r) => r.canonical_url));
  }
  async recentTitles(hours: number) {
    return this.sql<{ id: string; title: string }[]>`select id, title from articles where published_at > now() - make_interval(hours => ${hours})`;
  }
  async insertArticles(articles: Article[]) {
    let inserted = 0;
    await this.sql.begin(async (tx) => {
      for (const a of articles) {
        await tx`insert into sources (id, name, url, country_code, kind, reliability)
                 values (${a.source.id}, ${a.source.name}, ${a.source.url}, ${a.source.country && countryByCode.has(a.source.country) ? a.source.country : null}, ${a.source.kind}, ${a.source.reliability})
                 on conflict (id) do update set name = excluded.name, url = excluded.url`;
        const res = await tx`insert into articles (id, slug, title, summary, summary_source, url, canonical_url, title_fingerprint, image_url, language, published_at, ingested_at, source_id, content_type, quality, coverage, status, trace, is_demo)
          values (${a.id}, ${a.slug}, ${a.title}, ${a.summary}, ${a.summarySource}, ${a.url}, ${a.canonicalUrl}, ${titleFingerprint(a.title)}, ${a.imageUrl}, ${a.language}, ${a.publishedAt}, ${a.ingestedAt}, ${a.source.id}, ${a.contentType}, ${a.quality}, ${a.coverage}, ${a.status}, ${tx.json(a.trace as never)}, ${a.isDemo})
          on conflict do nothing returning id`;
        if (!res.length) continue;
        inserted++;
        for (const c of a.countries) if (countryByCode.has(c.code))
          await tx`insert into article_countries (article_id, country_code, role, confidence) values (${a.id}, ${c.code}, ${c.role}, ${c.confidence}) on conflict do nothing`;
        for (const i of a.industries) await tx`insert into article_industries values (${a.id}, ${i}) on conflict do nothing`;
        for (const t of a.topics) await tx`insert into article_topics values (${a.id}, ${t}) on conflict do nothing`;
        for (const o of a.organizations) {
          const [org] = await tx<{ id: number }[]>`insert into organizations (name) values (${o}) on conflict (name) do update set name = excluded.name returning id`;
          await tx`insert into article_organizations values (${a.id}, ${org.id}) on conflict do nothing`;
        }
      }
    });
    this.demoCache = null;
    return inserted;
  }
  async bumpCoverage(id: string) {
    await this.sql`update articles set coverage = coverage + 1, updated_at = now() where id = ${id}`;
  }
  async saveJob(j: IngestionJob) {
    await this.sql`insert into ingestion_jobs (id, provider, started_at, finished_at, status, fetched, inserted, duplicates, rejected, errors)
      values (${j.id}, ${j.provider}, ${j.startedAt}, ${j.finishedAt}, ${j.status}, ${j.fetched}, ${j.inserted}, ${j.duplicates}, ${j.rejected}, ${this.sql.json(j.errors)})
      on conflict (id) do update set finished_at = excluded.finished_at, status = excluded.status, fetched = excluded.fetched, inserted = excluded.inserted,
        duplicates = excluded.duplicates, rejected = excluded.rejected, errors = excluded.errors`;
  }
  async listJobs(limit = 30): Promise<IngestionJob[]> {
    const rows = await this.sql`select * from ingestion_jobs order by started_at desc limit ${limit}`;
    return rows.map((r) => ({
      id: r.id, provider: r.provider, startedAt: new Date(r.started_at).toISOString(), finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
      status: r.status, fetched: r.fetched, inserted: r.inserted, duplicates: r.duplicates, rejected: r.rejected, errors: r.errors,
    }));
  }
  async end() {
    await this.sql.end();
  }
}
