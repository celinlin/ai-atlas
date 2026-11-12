"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { countryName, industryLabel, relativeTime, typeLabel } from "@/lib/i18n/labels";
import type { Article } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tag } from "@/components/ui/chip";
import { OriginalLink, SaveButton } from "./actions";

export type CardVariant = "lead" | "default" | "compact" | "row";

export function ArticleKicker({ article, className }: { article: Article; className?: string }) {
  const { locale, t } = useI18n();
  const ev = article.countries.filter((c) => c.role === "event").map((c) => c.code);
  const place = ev.length ? ev.slice(0, 2).map((c) => countryName(c, locale)).join(" · ") + (ev.length > 2 ? ` +${ev.length - 2}` : "") : t.common.global;
  const sector = article.industries[0] && article.industries[0] !== "general" ? industryLabel(article.industries[0], locale) : null;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-medium uppercase tracking-[0.07em] text-muted", className)}>
      {ev[0] ? (
        <Link href={`/country/${ev[0]}`} className="text-accent-2 hover:underline">{place}</Link>
      ) : (
        <span className="text-accent-2">{place}</span>
      )}
      {sector && <span aria-hidden className="text-line-strong">/</span>}
      {sector && <Link href={`/industries/${article.industries[0]}`} className="hover:text-ink">{sector}</Link>}
      <span aria-hidden className="text-line-strong">/</span>
      <span>{typeLabel(article.contentType, locale)}</span>
      {article.isDemo && <Tag tone="warning" className="ml-1 normal-case tracking-normal">{t.common.sample}</Tag>}
    </div>
  );
}

export function NewsCard({ article, variant = "default", className, index }: { article: Article; variant?: CardVariant; className?: string; index?: number }) {
  const { locale, t } = useI18n();
  const href = `/news/${article.slug}`;
  const time = (
    <time dateTime={article.publishedAt} suppressHydrationWarning title={new Date(article.publishedAt).toUTCString()}>
      {relativeTime(article.publishedAt, locale, t.common)}
    </time>
  );

  if (variant === "row") {
    return (
      <article className={cn("group grid grid-cols-[2.25rem_1fr] gap-3 py-4", className)}>
        <span className="font-display text-2xl leading-none text-line-strong tabular">{String((index ?? 0) + 1).padStart(2, "0")}</span>
        <div className="min-w-0">
          <ArticleKicker article={article} className="mb-1.5" />
          <h3 className="font-display text-[17px] leading-snug text-ink">
            <Link href={href} className="decoration-line-strong underline-offset-4 group-hover:underline">{article.title}</Link>
          </h3>
          <p className="mt-1.5 text-[12.5px] text-muted">{article.source.name} · {time}</p>
        </div>
      </article>
    );
  }

  const lead = variant === "lead";
  const compact = variant === "compact";
  return (
    <article className={cn("group relative flex flex-col", lead ? "gap-3" : "gap-2", className)}>
      <ArticleKicker article={article} />
      <h3 className={cn("font-display text-ink", lead ? "text-[28px] leading-[1.12] md:text-[34px]" : compact ? "text-[16.5px] leading-snug" : "text-[19px] leading-snug md:text-[20px]")}>
        <Link href={href} className="decoration-line-strong decoration-1 underline-offset-[5px] group-hover:underline">
          {article.title}
        </Link>
      </h3>
      {!compact && article.summary && (
        <p className={cn("text-ink-2", lead ? "text-[15.5px] leading-relaxed" : "line-clamp-3 text-[14px] leading-relaxed")}>{article.summary}</p>
      )}
      <div className="mt-auto flex items-center gap-3 pt-1 text-[12.5px] text-muted">
        <span className="min-w-0 truncate">
          <span className="text-ink-2">{article.source.name}</span> · {time}
          {article.coverage > 1 && <span className="hidden sm:inline"> · {t.common.coverage.replace("{n}", String(article.coverage))}</span>}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <OriginalLink article={article} />
          <SaveButton article={article} />
        </span>
      </div>
    </article>
  );
}

export function NewsCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden>
      <div className="skeleton h-3 w-32" />
      <div className="skeleton h-5 w-11/12" />
      <div className="skeleton h-5 w-2/3" />
      {Array.from({ length: lines - 2 }).map((_, i) => <div key={i} className="skeleton h-3.5 w-full" />)}
    </div>
  );
}
