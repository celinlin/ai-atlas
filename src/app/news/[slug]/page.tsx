import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FooterNav } from "@/components/layout/nav";
import { OriginalLink, SaveButton } from "@/components/news/actions";
import { ArticleKicker, NewsCard } from "@/components/news/news-card";
import { TrackRead } from "@/components/news/track";
import { Tag } from "@/components/ui/chip";
import { Container } from "@/components/ui/section";
import { repo } from "@/lib/data";
import { countryName, formatDate, industryLabel, topicLabel, typeLabel } from "@/lib/i18n/labels";
import { getDictionary } from "@/lib/i18n/server";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const a = await repo().getArticle((await params).slug);
  if (!a) notFound();
  return { title: a.title, description: a.summary };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const { t, locale } = await getDictionary();
  const a = await repo().getArticle(slug);
  if (!a) notFound();
  const related = await repo().related(a, 4);
  const events = a.countries.filter((c) => c.role === "event");
  const mentioned = a.countries.filter((c) => c.role === "mentioned");
  let host = "";
  try {
    host = a.url ? new URL(a.url).hostname.replace(/^www\./, "") : "";
  } catch {}

  return (
    <>
      <TrackRead article={a} />
      <Container className="pt-8 md:pt-12">
        <Link href="/news" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" />
          {t.news.title}
        </Link>
        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
          <article className="min-w-0">
            <ArticleKicker article={a} />
            <h1 className="font-display mt-4 text-[34px] leading-[1.08] text-ink md:text-[48px]">{a.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-muted">
              <span className="font-medium text-ink-2">{a.source.name}</span>
              <span aria-hidden>·</span>
              <time dateTime={a.publishedAt}>{t.article.published} {formatDate(a.publishedAt, locale, true)}</time>
            </div>

            <section className="mt-9 border-l-2 border-accent pl-5">
              <h2 className="eyebrow mb-2">{t.article.summary}</h2>
              <p className="font-display text-[21px] leading-[1.5] text-ink">{a.summary || "—"}</p>
              <p className="mt-3 text-[12px] text-muted">{t.article.summarySource[a.summarySource]}</p>
            </section>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <OriginalLink article={a} variant="button" />
              <SaveButton article={a} withLabel className="h-11 px-4" />
            </div>

            {/* Original-source attribution */}
            <section className="mt-12 rounded-2xl border border-line bg-surface p-5">
              <h2 className="eyebrow mb-3">{t.article.attribution}</h2>
              <dl className="grid gap-x-6 gap-y-3 text-[13.5px] sm:grid-cols-2">
                <div><dt className="text-muted">{t.common.source}</dt><dd className="text-ink">{a.source.name}{host && <span className="text-muted"> · {host}</span>}</dd></div>
                <div><dt className="text-muted">{t.article.publisher}</dt><dd className="text-ink">{a.source.country ? countryName(a.source.country, locale) : "—"}</dd></div>
                <div><dt className="text-muted">{t.article.published}</dt><dd className="text-ink">{formatDate(a.publishedAt, locale, true)}</dd></div>
                <div><dt className="text-muted">{t.article.ingested}</dt><dd className="text-ink">{formatDate(a.ingestedAt, locale, true)}</dd></div>
              </dl>
              <p className="mt-4 text-[12.5px] leading-relaxed text-muted">{t.article.attributionNote}</p>
            </section>
          </article>

          {/* Context rail */}
          <aside className="space-y-7 lg:pt-2">
            <section>
              <h2 className="eyebrow mb-2.5">{t.article.where}</h2>
              {events.length ? (
                <ul className="space-y-1.5">
                  {events.map((c) => (
                    <li key={c.code}>
                      <Link href={`/country/${c.code}`} className="group flex items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-2.5 hover:border-line-strong">
                        <span className="text-[14px] text-ink group-hover:text-accent-2">{countryName(c.code, locale)}</span>
                        <span className="text-[12px] text-muted">{t.common.viewCountry} →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-ink-2">{t.common.global}</p>
              )}
              {mentioned.length > 0 && (
                <p className="mt-2.5 text-[12.5px] text-muted">{t.article.mentioned}: {mentioned.map((c) => countryName(c.code, locale)).join(", ")}</p>
              )}
            </section>
            <section className="grid grid-cols-2 gap-4">
              <div>
                <h2 className="eyebrow mb-2">{t.article.sectors}</h2>
                <div className="flex flex-wrap gap-1">{a.industries.map((i) => <Link key={i} href={`/industries/${i}`}><Tag>{industryLabel(i, locale)}</Tag></Link>)}</div>
              </div>
              <div>
                <h2 className="eyebrow mb-2">{t.article.type}</h2>
                <Link href={`/news?type=${a.contentType}`}><Tag tone="accent">{typeLabel(a.contentType, locale)}</Tag></Link>
              </div>
            </section>
            {a.organizations.length > 0 && (
              <section>
                <h2 className="eyebrow mb-2">{t.article.entities}</h2>
                <ul className="flex flex-wrap gap-1.5">
                  {a.organizations.map((o) => (
                    <li key={o}><Link href={`/news?org=${encodeURIComponent(o)}`} className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-2.5 text-[12.5px] text-ink-2 hover:border-line-strong hover:text-ink">{o}</Link></li>
                  ))}
                </ul>
              </section>
            )}
            {a.topics.length > 0 && (
              <section>
                <h2 className="eyebrow mb-2">{t.article.topics}</h2>
                <p className="text-[13.5px] text-ink-2">{a.topics.map((tp) => topicLabel(tp, locale)).join(" · ")}</p>
              </section>
            )}
            <section className="rounded-xl bg-surface-2 p-4">
              <h2 className="eyebrow mb-2">{t.article.why}</h2>
              <p className="mb-2 text-[12.5px] font-medium text-ink-2">{t.article.method[a.trace.method]}</p>
              <ul className="space-y-1 text-[12px] leading-relaxed text-muted">
                {[...a.trace.geo, ...a.trace.industries, ...a.trace.type].slice(0, 6).map((line, i) => <li key={i}>{line}</li>)}
              </ul>
              <p className="mt-2 text-[12px] text-muted">{t.article.quality}: <span className="tabular">{Math.round(a.quality * 100)}</span>/100</p>
            </section>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display mb-6 border-b border-line pb-3 text-2xl text-ink">{t.article.related}</h2>
            <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{related.map((r) => <NewsCard key={r.id} article={r} variant="compact" />)}</div>
          </section>
        )}
      </Container>
      <FooterNav />
    </>
  );
}
