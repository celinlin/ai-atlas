import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FooterNav } from "@/components/layout/nav";
import { NewsCard } from "@/components/news/news-card";
import { Container } from "@/components/ui/section";
import { repo } from "@/lib/data";
import { format } from "@/lib/i18n/dictionaries";
import { countryName, industryLabel, topicLabel } from "@/lib/i18n/labels";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.search.title };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { t, locale } = await getDictionary();
  const q = ((await searchParams).q ?? "").trim().slice(0, 120);
  const res = q ? await repo().search(q, 24) : null;
  const pill = "inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13.5px] text-ink hover:border-line-strong";
  const nothing = res && !res.articles.length && !res.countries.length && !res.organizations.length && !res.topics.length && !res.industries.length;

  return (
    <>
      <Container className="max-w-[1080px] pt-10 md:pt-14">
        <h1 className="font-display mb-6 text-[40px] leading-none text-ink md:text-[52px]">{t.search.title}</h1>
        <form action="/search" role="search" className="flex h-14 items-center gap-3 rounded-full border border-line-strong bg-surface px-5 focus-within:border-ink/40">
          <Search className="size-5 text-muted" />
          <input name="q" defaultValue={q} autoFocus placeholder={t.search.placeholder} aria-label={t.search.placeholder} className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-muted" />
        </form>
        {!res && <p className="mt-6 text-[14px] text-muted">{t.search.prompt}</p>}
        {nothing && <p className="mt-10 text-[15px] text-muted">{format(t.search.empty, { q })}</p>}
        {res && !nothing && (
          <div className="mt-10 space-y-10">
            {(res.countries.length > 0 || res.industries.length > 0 || res.organizations.length > 0 || res.topics.length > 0) && (
              <div className="grid gap-8 md:grid-cols-2">
                {res.countries.length > 0 && (
                  <section><h2 className="eyebrow mb-3">{t.search.countries}</h2><div className="flex flex-wrap gap-2">{res.countries.map((c) => <Link key={c} href={`/country/${c}`} className={pill}>{countryName(c, locale)}</Link>)}</div></section>
                )}
                {res.industries.length > 0 && (
                  <section><h2 className="eyebrow mb-3">{t.search.industries}</h2><div className="flex flex-wrap gap-2">{res.industries.map((i) => <Link key={i} href={`/industries/${i}`} className={pill}>{industryLabel(i, locale)}</Link>)}</div></section>
                )}
                {res.organizations.length > 0 && (
                  <section><h2 className="eyebrow mb-3">{t.search.organizations}</h2><div className="flex flex-wrap gap-2">{res.organizations.map((o) => <Link key={o.name} href={`/news?org=${encodeURIComponent(o.name)}`} className={pill}>{o.name}<span className="text-[12px] text-muted">{o.count}</span></Link>)}</div></section>
                )}
                {res.topics.length > 0 && (
                  <section><h2 className="eyebrow mb-3">{t.search.topics}</h2><div className="flex flex-wrap gap-2">{res.topics.map((x) => <Link key={x.topic} href={`/news?topic=${x.topic}`} className={pill}>{topicLabel(x.topic, locale)}<span className="text-[12px] text-muted">{x.count}</span></Link>)}</div></section>
                )}
              </div>
            )}
            {res.articles.length > 0 && (
              <section>
                <h2 className="eyebrow mb-1">{t.search.stories} · {res.articles.length}</h2>
                <div className="divide-y divide-line">{res.articles.map((a) => <NewsCard key={a.id} article={a} className="py-6" />)}</div>
              </section>
            )}
          </div>
        )}
      </Container>
      <FooterNav />
    </>
  );
}
