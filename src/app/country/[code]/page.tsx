import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BarList, Sparkline } from "@/components/charts/sparkline";
import { FollowButton } from "@/components/country/follow-button";
import { FilterBar } from "@/components/filters/filter-bar";
import { FooterNav } from "@/components/layout/nav";
import { NewsCard } from "@/components/news/news-card";
import { TrackCountry } from "@/components/news/track";
import { Container } from "@/components/ui/section";
import { repo } from "@/lib/data";
import { countryByCode } from "@/lib/geo/countries";
import { format } from "@/lib/i18n/dictionaries";
import { countryName, industryLabel, regionLabel, topicLabel, typeLabel } from "@/lib/i18n/labels";
import { getDictionary } from "@/lib/i18n/server";
import { parseQuery, queryToSearchParams } from "@/lib/query";

type Params = Promise<{ code: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, t } = await getDictionary();
  const code = (await params).code.toUpperCase();
  if (!countryByCode.has(code)) notFound();
  return { title: `${countryName(code, locale)} — ${t.country.intelligence}` };
}

export default async function CountryPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const code = (await params).code.toUpperCase();
  const c = countryByCode.get(code);
  if (!c) notFound();
  const { t, locale } = await getDictionary();
  const q = { ...parseQuery(await searchParams), countries: [code], regions: undefined };
  const f = { range: q.range, from: q.from, to: q.to, industries: q.industries, types: q.types };
  const [profile, list] = await Promise.all([repo().countryProfile(code, f), repo().listArticles(q)]);
  const name = countryName(code, locale);
  const more = queryToSearchParams(q);
  more.delete("country");
  more.set("limit", String((q.limit ?? 20) + 20));

  return (
    <>
      <TrackCountry code={code} />
      <Container className="pt-10 md:pt-14">
        <header className="grid gap-8 border-b border-line pb-8 md:grid-cols-[minmax(0,1fr)_340px] md:items-end">
          <div>
            <p className="eyebrow">{regionLabel(c.region, locale)} · {t.country.intelligence}</p>
            <h1 className="font-display mt-2 text-[48px] leading-none text-ink md:text-[64px]">{name}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <FollowButton kind="country" id={code} />
              <Link href={`/explore?c=${code}`} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] text-muted hover:text-ink">
                {t.nav.explore} <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <div className="flex items-end gap-6">
            <div>
              <p className="font-display text-[44px] leading-none text-ink tabular">{profile.total}</p>
              <p className="mt-1 text-[12px] text-muted">{t.country.stories}</p>
            </div>
            <div className="flex-1">
              <Sparkline values={profile.daily.map((d) => d.count)} className="h-12" label={t.country.activity} />
              <p className="mt-1 text-right text-[11px] text-muted">{t.country.activity}</p>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-12 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-8">
            {profile.industries.length > 0 && (
              <section>
                <h2 className="eyebrow mb-2">{t.country.sectors}</h2>
                <BarList items={profile.industries.slice(0, 8).map((i) => ({ key: i.slug, label: industryLabel(i.slug, locale), value: i.count }))} />
              </section>
            )}
            {profile.types.length > 0 && (
              <section>
                <h2 className="eyebrow mb-2">{t.country.types}</h2>
                <BarList items={profile.types.map((i) => ({ key: i.slug, label: typeLabel(i.slug, locale), value: i.count }))} />
              </section>
            )}
            {profile.organizations.length > 0 && (
              <section>
                <h2 className="eyebrow mb-2">{t.country.organizations}</h2>
                <ul className="space-y-1.5 text-[13.5px]">
                  {profile.organizations.map((o) => <li key={o.name}><Link href={`/news?org=${encodeURIComponent(o.name)}`} className="text-ink-2 hover:text-accent-2">{o.name}</Link></li>)}
                </ul>
              </section>
            )}
            {profile.topics.length > 0 && (
              <section>
                <h2 className="eyebrow mb-2">{t.country.topics}</h2>
                <p className="text-[13.5px] leading-relaxed text-ink-2">{profile.topics.map((x) => topicLabel(x.topic, locale)).join(" · ")}</p>
              </section>
            )}
            <p className="text-[12px] leading-relaxed text-muted">{t.country.publisherNote}</p>
          </aside>
          <section className="min-w-0">
            <Suspense>
              <FilterBar hide={["country"]} />
            </Suspense>
            {list.items.length === 0 ? (
              <p className="py-16 text-[15px] text-muted">{format(t.country.empty, { country: name })}</p>
            ) : (
              <div className="mt-6 divide-y divide-line">
                {list.items.map((a) => <NewsCard key={a.id} article={a} className="py-6" />)}
              </div>
            )}
            {list.total > list.items.length && (
              <Link href={`/country/${code}?${more}`} scroll={false} className="mt-6 inline-flex h-10 items-center rounded-full border border-line-strong px-5 text-sm hover:border-ink/40">{t.common.more}</Link>
            )}
          </section>
        </div>
      </Container>
      <FooterNav />
    </>
  );
}
