import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Sparkline } from "@/components/charts/sparkline";
import { FooterNav } from "@/components/layout/nav";
import { HomeMap } from "@/components/map/home-map";
import { NewsCard } from "@/components/news/news-card";
import { ForYouStrip } from "@/components/radar/for-you";
import { Container, SectionHeader } from "@/components/ui/section";
import { repo } from "@/lib/data";
import { countryByCode } from "@/lib/geo/countries";
import { format } from "@/lib/i18n/dictionaries";
import { countryName, formatNumber, industryLabel, regionLabel, topicLabel } from "@/lib/i18n/labels";
import { getDictionary } from "@/lib/i18n/server";
import { industryBySlug } from "@/lib/taxonomy";

export default async function HomePage() {
  const { t, locale } = await getDictionary();
  const r = repo();
  const [activity, pulse, top, latest, industries, trending] = await Promise.all([
    r.countryActivity({ range: "30d" }),
    r.pulse(),
    r.listArticles({ sort: "top", range: "7d", limit: 5 }),
    r.listArticles({ sort: "latest", limit: 8 }),
    r.industryStats({ range: "30d" }),
    r.trendingTopics(10),
  ]);
  const topIds = new Set(top.items.map((a) => a.id));
  const latestRest = latest.items.filter((a) => !topIds.has(a.id)).slice(0, 6);
  const [lead, ...rest] = top.items;
  const spotlight = industries.filter((i) => i.slug !== "general" && i.count > 0).slice(0, 4);
  const stats = [
    { label: t.home.pulse24h, value: pulse.articles24h },
    { label: t.home.pulse7d, value: pulse.articles7d },
    { label: t.home.pulseCountries, value: pulse.activeCountries },
    { label: t.home.pulseSources, value: pulse.sources },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <Container className="grid gap-8 pb-8 pt-10 md:pt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-10 lg:pb-14">
          <div className="animate-fade-up">
            <p className="eyebrow mb-4">{t.brand.name}</p>
            <h1 className="font-display text-[44px] leading-[1.02] text-ink sm:text-[56px] lg:text-[64px]">{t.brand.tagline}</h1>
            <p className="mt-5 max-w-[34rem] text-[16.5px] leading-relaxed text-ink-2">{t.home.heroLead}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/explore" className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-medium text-accent-ink transition-colors hover:bg-accent/90">
                {t.home.cta}
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/news" className="inline-flex h-12 items-center rounded-full px-4 text-[15px] text-ink-2 hover:text-ink">{t.home.ctaSecondary}</Link>
            </div>
          </div>
          <div className="relative -mx-4 h-[340px] sm:mx-0 sm:h-[440px] sm:rounded-3xl sm:border sm:border-line lg:h-[520px]">
            <HomeMap activity={activity} />
            <p className="pointer-events-none absolute bottom-3 left-4 max-w-[260px] text-[11.5px] leading-snug text-muted">{t.home.mapCaption}</p>
          </div>
        </Container>
      </section>

      <Container className="space-y-16 pt-12 md:space-y-20 md:pt-16">
        {/* Global AI Pulse */}
        <section aria-labelledby="pulse">
          <SectionHeader title={t.home.pulse} />
          <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.6fr)]">
            {stats.map((s) => (
              <div key={s.label} className="bg-surface p-5">
                <p className="font-display text-[34px] leading-none text-ink tabular">{formatNumber(s.value, locale)}</p>
                <p className="mt-2 text-[12.5px] text-muted">{s.label}</p>
              </div>
            ))}
            <div className="bg-surface p-5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="eyebrow shrink-0">{t.home.last14}</p>
                <p className="truncate text-[12px] text-muted">{pulse.topIndustries.slice(0, 3).map((i) => industryLabel(i.slug, locale)).join(" · ")}</p>
              </div>
              <Sparkline values={pulse.daily.map((d) => d.count)} className="mt-3 h-12" label={t.home.last14} />
            </div>
          </div>
        </section>

        {/* Top stories */}
        {lead && (
          <section>
            <SectionHeader title={t.home.topStories} href="/news?view=top" linkLabel={t.common.seeAll} />
            <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
              <NewsCard article={lead} variant="lead" />
              <div className="divide-y divide-line border-t border-line lg:border-t-0">
                {rest.map((a) => <NewsCard key={a.id} article={a} variant="compact" className="py-4 first:pt-4 lg:first:pt-0" />)}
              </div>
            </div>
          </section>
        )}

        <ForYouStrip />

        {/* Trending countries + topics */}
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section>
            <SectionHeader title={t.home.trendingCountries} href="/explore" linkLabel={t.nav.explore} />
            <ol className="grid gap-x-8 sm:grid-cols-2">
              {activity.slice(0, 10).map((c, i) => {
                const cc = countryByCode.get(c.code);
                return (
                  <li key={c.code} className="border-b border-line">
                    <Link href={`/country/${c.code}`} className="group flex items-center gap-4 py-3">
                      <span className="w-5 text-[12px] text-muted tabular">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] text-ink group-hover:text-accent-2">{countryName(c.code, locale)}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {cc ? regionLabel(cc.region, locale) : ""}
                          {c.industries[0] && c.industries[0].slug !== "general" ? ` · ${industryLabel(c.industries[0].slug, locale)}` : ""}
                        </span>
                      </span>
                      <span className="text-[13px] text-ink-2 tabular">{c.count}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
          <section>
            <SectionHeader title={t.home.trendingTopics} href="/news?view=trending" linkLabel={t.common.seeAll} />
            <ul className="flex flex-wrap gap-2">
              {trending.map((tp) => (
                <li key={tp.topic}>
                  <Link href={`/news?topic=${tp.topic}`} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13.5px] text-ink transition-colors hover:border-line-strong">
                    {topicLabel(tp.topic, locale)}
                    <span className="text-[12px] text-muted tabular">{tp.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Industry spotlight */}
        {spotlight.length > 0 && (
          <section>
            <SectionHeader title={t.home.industrySpotlight} href="/industries" linkLabel={t.nav.industries} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {spotlight.map((i) => (
                <Link key={i.slug} href={`/industries/${i.slug}`} className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
                  <p className="font-display text-[22px] leading-tight text-ink">{industryLabel(i.slug, locale)}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted">{industryBySlug.get(i.slug)?.blurb[locale]}</p>
                  <Sparkline values={i.daily} className="mt-5 h-8" />
                  <p className="mt-3 text-[12.5px] text-ink-2">
                    <span className="tabular">{i.count}</span> {t.common.stories} · {format(t.industries.countries, { n: i.countries })}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Latest */}
        <section>
          <SectionHeader title={t.home.latest} href="/news?view=latest" linkLabel={t.common.seeAll} />
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {latestRest.map((a) => <NewsCard key={a.id} article={a} />)}
          </div>
        </section>
      </Container>
      <FooterNav />
    </>
  );
}
