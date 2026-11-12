import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FollowButton } from "@/components/country/follow-button";
import { FilterBar } from "@/components/filters/filter-bar";
import { FooterNav } from "@/components/layout/nav";
import { IndustryMap } from "@/components/map/industry-map";
import { NewsCard } from "@/components/news/news-card";
import { Container, SectionHeader } from "@/components/ui/section";
import { repo } from "@/lib/data";
import { format } from "@/lib/i18n/dictionaries";
import { countryName, industryLabel } from "@/lib/i18n/labels";
import { getDictionary } from "@/lib/i18n/server";
import { parseQuery } from "@/lib/query";
import { industryBySlug, isIndustry } from "@/lib/taxonomy";

type Params = Promise<{ slug: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await getDictionary();
  const { slug } = await params;
  if (!isIndustry(slug)) notFound();
  return { title: industryLabel(slug, locale) };
}

export default async function IndustryPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { slug } = await params;
  if (!isIndustry(slug)) notFound();
  const { t, locale } = await getDictionary();
  const q = { ...parseQuery(await searchParams), industries: [slug] };
  const [activity, list] = await Promise.all([
    repo().countryActivity({ range: q.range ?? "30d", industries: [slug], types: q.types }),
    repo().listArticles(q),
  ]);
  const label = industryLabel(slug, locale);

  return (
    <>
      <Container className="pt-10 md:pt-14">
        <header className="mb-8">
          <p className="eyebrow">{t.industries.title}</p>
          <h1 className="font-display mt-2 text-[44px] leading-none text-ink md:text-[60px]">{label}</h1>
          <p className="mt-3 max-w-xl text-[15px] text-ink-2">{industryBySlug.get(slug)?.blurb[locale]}</p>
          <FollowButton kind="industry" id={slug} className="mt-5" />
        </header>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="relative h-[300px] overflow-hidden rounded-2xl border border-line md:h-[380px]">
            <IndustryMap activity={activity} industry={slug} />
          </div>
          <section>
            <SectionHeader title={t.industries.topCountries} />
            <ol className="space-y-0.5">
              {activity.slice(0, 8).map((c, i) => (
                <li key={c.code}>
                  <Link href={`/country/${c.code}?industry=${slug}`} className="flex items-center gap-3 rounded-lg px-2 py-2 text-[14px] hover:bg-surface-2">
                    <span className="w-4 text-[12px] text-muted tabular">{i + 1}</span>
                    <span className="flex-1 text-ink">{countryName(c.code, locale)}</span>
                    <span className="text-muted tabular">{c.count}</span>
                  </Link>
                </li>
              ))}
              {activity.length === 0 && <li className="text-[14px] text-muted">{t.common.noResults}</li>}
            </ol>
          </section>
        </div>
        <section className="mt-14">
          <SectionHeader title={format(t.industries.latest, { industry: label })} eyebrow={format(t.news.results, { n: list.total })} />
          <Suspense>
            <FilterBar hide={["industry"]} />
          </Suspense>
          <div className="mt-8 grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {list.items.map((a) => <NewsCard key={a.id} article={a} />)}
          </div>
          {list.items.length === 0 && <p className="py-12 text-muted">{t.common.noResults}</p>}
        </section>
      </Container>
      <FooterNav />
    </>
  );
}
