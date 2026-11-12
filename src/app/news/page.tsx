import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { FooterNav } from "@/components/layout/nav";
import { NewsCard } from "@/components/news/news-card";
import { NewsTabs } from "@/components/news/news-tabs";
import { NEWS_VIEWS, type NewsView } from "@/lib/news-views";
import { FollowingFeed, RadarFeed } from "@/components/radar/radar-feed";
import { Container, SectionHeader } from "@/components/ui/section";
import { repo } from "@/lib/data";
import { format } from "@/lib/i18n/dictionaries";
import { countryName, industryLabel, topicLabel } from "@/lib/i18n/labels";
import { getDictionary } from "@/lib/i18n/server";
import { parseQuery, queryToSearchParams } from "@/lib/query";
import { INDUSTRIES } from "@/lib/taxonomy";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.news.title };
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function NewsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { t, locale } = await getDictionary();
  const rawView = typeof sp.view === "string" ? sp.view : "latest";
  const view: NewsView = (NEWS_VIEWS as readonly string[]).includes(rawView) ? (rawView as NewsView) : "latest";
  const q = parseQuery(sp);
  const r = repo();

  let body: React.ReactNode;
  if (view === "forYou") {
    body = (
      <RadarFeed
        empty={
          <div className="rounded-2xl border border-dashed border-line-strong p-8 text-center">
            <p className="font-display text-xl text-ink">{t.home.forYouEmpty}</p>
            <Link href="/radar" className="mt-4 inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-bg">{t.home.setUpRadar}</Link>
          </div>
        }
      />
    );
  } else if (view === "following") {
    body = <FollowingFeed />;
  } else if (view === "byCountry") {
    const act = (await r.countryActivity({ range: q.range ?? "30d", industries: q.industries, types: q.types })).slice(0, 8);
    const groups = await Promise.all(act.map(async (c) => ({ code: c.code, count: c.count, items: (await r.listArticles({ ...q, countries: [c.code], sort: "top", limit: 3, offset: 0 })).items })));
    body = (
      <div className="space-y-14">
        {groups.filter((g) => g.items.length).map((g) => (
          <section key={g.code}>
            <SectionHeader title={countryName(g.code, locale)} eyebrow={format(t.news.results, { n: g.count })} href={`/country/${g.code}`} linkLabel={t.common.viewCountry} />
            <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">{g.items.map((a) => <NewsCard key={a.id} article={a} />)}</div>
          </section>
        ))}
      </div>
    );
  } else if (view === "byIndustry") {
    const groups = (
      await Promise.all(
        INDUSTRIES.map(async (i) => {
          const res = await r.listArticles({ ...q, industries: [i.slug], sort: "top", limit: 3, offset: 0 });
          return { slug: i.slug, total: res.total, items: res.items };
        }),
      )
    ).filter((g) => g.total > 0).sort((a, b) => b.total - a.total);
    body = (
      <div className="space-y-14">
        {groups.map((g) => (
          <section key={g.slug}>
            <SectionHeader title={industryLabel(g.slug, locale)} eyebrow={format(t.news.results, { n: g.total })} href={`/industries/${g.slug}`} linkLabel={t.common.seeAll} />
            <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">{g.items.map((a) => <NewsCard key={a.id} article={a} />)}</div>
          </section>
        ))}
      </div>
    );
  } else if (view === "trending") {
    const topics = (await r.trendingTopics(6)).slice(0, 6);
    const groups = await Promise.all(topics.map(async (tp) => ({ ...tp, items: (await r.listArticles({ ...q, topics: [tp.topic], range: q.range ?? "7d", sort: "top", limit: 3, offset: 0 })).items })));
    body = (
      <div className="space-y-14">
        {groups.map((g) => (
          <section key={g.topic}>
            <SectionHeader
              title={topicLabel(g.topic, locale)}
              eyebrow={`${format(t.news.results, { n: g.count })}${g.delta > 0 ? ` · +${Math.round(g.delta * 100)}%` : ""}`}
              href={`/news?topic=${g.topic}`}
              linkLabel={t.common.seeAll}
            />
            <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">{g.items.map((a) => <NewsCard key={a.id} article={a} />)}</div>
          </section>
        ))}
      </div>
    );
  } else {
    const query = { ...q, sort: view === "top" ? ("top" as const) : q.sort };
    const res = await r.listArticles(query);
    const nextSp = queryToSearchParams(query);
    nextSp.set("view", view);
    nextSp.set("limit", String((q.limit ?? 20) + 20));
    body = (
      <>
        <p className="mb-6 text-[13px] text-muted tabular" aria-live="polite">{format(t.news.results, { n: res.total })}</p>
        {res.items.length === 0 ? (
          <p className="py-16 text-center text-muted">{t.common.noResults}</p>
        ) : (
          <div className="grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {res.items.map((a) => <NewsCard key={a.id} article={a} />)}
          </div>
        )}
        {res.total > res.items.length && (
          <div className="mt-12 text-center">
            <Link href={`/news?${nextSp}`} scroll={false} className="inline-flex h-10 items-center rounded-full border border-line-strong px-5 text-sm hover:border-ink/40">{t.common.more}</Link>
          </div>
        )}
      </>
    );
  }

  const filtersApply = !["forYou", "following"].includes(view);
  return (
    <>
      <Container className="pt-10 md:pt-14">
        <header className="mb-6">
          <h1 className="font-display text-[40px] leading-none text-ink md:text-[52px]">{t.news.title}</h1>
          <p className="mt-3 max-w-xl text-[15px] text-ink-2">{t.news.subtitle}</p>
        </header>
        <Suspense>
          <NewsTabs current={view} />
          {filtersApply && <FilterBar className="mt-5" hide={view === "top" ? ["sort"] : view === "byCountry" ? ["country", "region", "sort"] : view === "byIndustry" ? ["industry", "sort"] : []} />}
        </Suspense>
        <div className="mt-8">{body}</div>
      </Container>
      <FooterNav />
    </>
  );
}
