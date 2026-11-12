import { countryByCode } from "@/lib/geo/countries";
import { INDUSTRIES } from "@/lib/taxonomy";
import { eventCountries, matchArticle, sortArticles } from "@/lib/query";
import type {
  Article, ArticleQuery, ContentType, CountryActivity, CountryProfile, IndustrySlug, PulseStats, SearchResults, TrendingTopic,
} from "@/lib/types";
import type { StatsFilter } from "./repository";

/** Pure aggregation helpers over an in-memory article set (local backend + tests). */

const DAY = 86_400_000;
function tally<T extends string>(values: T[]): { key: T; count: number }[] {
  const m = new Map<T, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export function dailySeries(articles: Article[], days: number, now = new Date()): { day: string; count: number }[] {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out = Array.from({ length: days }, (_, i) => ({ day: new Date(end - (days - 1 - i) * DAY).toISOString().slice(0, 10), count: 0 }));
  const idx = new Map(out.map((d, i) => [d.day, i]));
  for (const a of articles) {
    const i = idx.get(a.publishedAt.slice(0, 10));
    if (i !== undefined) out[i].count++;
  }
  return out;
}

export function countryActivity(articles: Article[], f: StatsFilter = {}, now = new Date()): CountryActivity[] {
  const filtered = articles.filter((a) => matchArticle(a, f, now));
  const by = new Map<string, Article[]>();
  for (const a of filtered) for (const c of eventCountries(a)) (by.get(c) ?? by.set(c, []).get(c)!).push(a);
  return [...by.entries()]
    .map(([code, list]) => ({
      code,
      count: list.length,
      industries: tally(list.flatMap((a) => a.industries)).slice(0, 3).map(({ key, count }) => ({ slug: key, count })),
      latestAt: list.reduce<string | null>((m, a) => (!m || a.publishedAt > m ? a.publishedAt : m), null),
    }))
    .sort((a, b) => b.count - a.count);
}

export function countryProfile(articles: Article[], code: string, f: StatsFilter = {}, now = new Date()): CountryProfile {
  const list = articles.filter((a) => matchArticle(a, { ...f, countries: [code] }, now));
  return {
    code,
    total: list.length,
    industries: tally(list.flatMap((a) => a.industries)).map(({ key, count }) => ({ slug: key, count })),
    types: tally(list.map((a) => a.contentType)).map(({ key, count }) => ({ slug: key, count })),
    organizations: tally(list.flatMap((a) => a.organizations)).slice(0, 8).map(({ key, count }) => ({ name: key, count })),
    topics: tally(list.flatMap((a) => a.topics)).slice(0, 8).map(({ key, count }) => ({ topic: key, count })),
    daily: dailySeries(articles.filter((a) => eventCountries(a).includes(code)), 30, now),
  };
}

export function industryStats(articles: Article[], f: StatsFilter = {}, now = new Date()) {
  const filtered = articles.filter((a) => matchArticle(a, { ...f, industries: undefined }, now));
  return INDUSTRIES.map((ind) => {
    const list = filtered.filter((a) => a.industries.includes(ind.slug));
    return {
      slug: ind.slug,
      count: list.length,
      countries: new Set(list.flatMap(eventCountries)).size,
      daily: dailySeries(list, 14, now).map((d) => d.count),
    };
  }).sort((a, b) => b.count - a.count);
}

export function pulse(articles: Article[], now = new Date(), lastIngestAt: string | null = null): PulseStats {
  const since = (h: number) => articles.filter((a) => now.getTime() - new Date(a.publishedAt).getTime() <= h * 3600_000);
  const week = since(24 * 7);
  return {
    articles24h: since(24).length,
    articles7d: week.length,
    activeCountries: new Set(week.flatMap(eventCountries)).size,
    sources: new Set(articles.map((a) => a.source.id)).size,
    daily: dailySeries(articles, 14, now),
    topIndustries: tally(week.flatMap((a) => a.industries)).slice(0, 6).map(({ key, count }) => ({ slug: key as IndustrySlug, count })),
    topTypes: tally(week.map((a) => a.contentType)).slice(0, 6).map(({ key, count }) => ({ slug: key as ContentType, count })),
    lastIngestAt,
  };
}

/** Topics ranked by volume in the last 7 days, with growth vs. the prior 7 days. */
export function trending(articles: Article[], limit = 8, now = new Date()): TrendingTopic[] {
  const t = now.getTime();
  const cur = new Map<string, number>();
  const prev = new Map<string, number>();
  for (const a of articles) {
    const age = t - new Date(a.publishedAt).getTime();
    const target = age <= 7 * DAY ? cur : age <= 14 * DAY ? prev : null;
    if (!target) continue;
    for (const topic of a.topics) target.set(topic, (target.get(topic) ?? 0) + 1);
  }
  return [...cur.entries()]
    .map(([topic, count]) => ({ topic, count, delta: (count - (prev.get(topic) ?? 0)) / Math.max(1, prev.get(topic) ?? 0) }))
    .sort((a, b) => b.count - a.count || b.delta - a.delta)
    .slice(0, limit);
}

export function related(articles: Article[], article: Article, limit = 4): Article[] {
  const ev = new Set(eventCountries(article));
  const scored = articles
    .filter((a) => a.id !== article.id)
    .map((a) => {
      let s = 0;
      for (const c of eventCountries(a)) if (ev.has(c)) s += 3;
      for (const i of a.industries) if (article.industries.includes(i) && i !== "general") s += 2;
      for (const t of a.topics) if (article.topics.includes(t)) s += 1.5;
      for (const o of a.organizations) if (article.organizations.includes(o)) s += 3;
      if (a.contentType === article.contentType) s += 0.5;
      return { a, s };
    })
    .filter((x) => x.s >= 2.5)
    .sort((x, y) => y.s - x.s || y.a.publishedAt.localeCompare(x.a.publishedAt));
  return scored.slice(0, limit).map((x) => x.a);
}

export function search(articles: Article[], q: string, limit = 20, now = new Date()): SearchResults {
  const needle = q.trim().toLowerCase();
  if (!needle) return { articles: [], countries: [], organizations: [], topics: [], industries: [] };
  const countries = [...countryByCode.values()]
    .filter((c) => c.en.toLowerCase().includes(needle) || c.fr.toLowerCase().includes(needle) || c.code.toLowerCase() === needle)
    .slice(0, 6)
    .map((c) => c.code);
  const orgCounts = new Map<string, number>();
  for (const a of articles) for (const o of a.organizations) if (o.toLowerCase().includes(needle)) orgCounts.set(o, (orgCounts.get(o) ?? 0) + 1);
  const topicCounts = new Map<string, number>();
  for (const a of articles) for (const t of a.topics) if (t.replace(/-/g, " ").includes(needle)) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  const industries = INDUSTRIES.filter((i) => i.en.toLowerCase().includes(needle) || i.fr.toLowerCase().includes(needle)).map((i) => i.slug);
  const q2: ArticleQuery = { q: needle };
  const matched = sortArticles(articles.filter((a) => matchArticle(a, q2, now)), "top", now).slice(0, limit);
  return {
    articles: matched,
    countries,
    organizations: [...orgCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
    topics: [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([topic, count]) => ({ topic, count })),
    industries,
  };
}
