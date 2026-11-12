import type { Metadata } from "next";
import Link from "next/link";
import { Sparkline } from "@/components/charts/sparkline";
import { FooterNav } from "@/components/layout/nav";
import { Container } from "@/components/ui/section";
import { repo } from "@/lib/data";
import { format } from "@/lib/i18n/dictionaries";
import { industryLabel } from "@/lib/i18n/labels";
import { getDictionary } from "@/lib/i18n/server";
import { industryBySlug } from "@/lib/taxonomy";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.industries.title };
}

export default async function IndustriesPage() {
  const { t, locale } = await getDictionary();
  const stats = await repo().industryStats({ range: "30d" });
  return (
    <>
      <Container className="pt-10 md:pt-14">
        <header className="mb-10">
          <h1 className="font-display text-[40px] leading-none text-ink md:text-[52px]">{t.industries.title}</h1>
          <p className="mt-3 max-w-xl text-[15px] text-ink-2">{t.industries.subtitle}</p>
        </header>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <Link key={s.slug} href={`/industries/${s.slug}`} className="group flex flex-col bg-surface p-6 transition-colors hover:bg-surface-2/60">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-[23px] leading-tight text-ink group-hover:text-accent-2">{industryLabel(s.slug, locale)}</h2>
                <span className="text-[13px] text-muted tabular">{s.count}</span>
              </div>
              <p className="mt-1 text-[13px] text-muted">{industryBySlug.get(s.slug)?.blurb[locale]}</p>
              <Sparkline values={s.daily} className="mt-6 h-8" />
              <p className="mt-2 text-[12px] text-muted">{format(t.industries.countries, { n: s.countries })}</p>
            </Link>
          ))}
        </div>
      </Container>
      <FooterNav />
    </>
  );
}
