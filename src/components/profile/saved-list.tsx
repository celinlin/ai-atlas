"use client";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import { OriginalLink } from "@/components/news/actions";
import { Tag } from "@/components/ui/chip";
import { useI18n } from "@/lib/i18n/client";
import { countryName, industryLabel, relativeTime, typeLabel } from "@/lib/i18n/labels";
import { setState, useAtlas, useHydrated } from "@/lib/store/atlas-store";

export function SavedList() {
  const { t, locale } = useI18n();
  const hydrated = useHydrated();
  const saved = useAtlas((s) => s.saved);
  if (!hydrated) return <div className="skeleton h-32" />;
  if (!saved.length)
    return (
      <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center">
        <Bookmark className="mx-auto mb-3 size-6 text-muted" />
        <p className="text-ink-2">{t.saved.empty}</p>
      </div>
    );
  return (
    <ul className="divide-y divide-line border-y border-line">
      {saved.map((s) => (
        <li key={s.id} className="flex gap-4 py-5">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-[11.5px] font-medium uppercase tracking-[0.07em] text-muted">
              <span className="text-accent-2">{s.countries.length ? s.countries.map((c) => countryName(c, locale)).join(" · ") : t.common.global}</span>
              {s.industries[0] && s.industries[0] !== "general" && ` / ${industryLabel(s.industries[0], locale)}`} / {typeLabel(s.contentType, locale)}
              {s.isDemo && <Tag tone="warning" className="ml-2 normal-case tracking-normal">{t.common.sample}</Tag>}
            </p>
            <h2 className="font-display text-[19px] leading-snug text-ink">
              <Link href={`/news/${s.slug}`} className="hover:underline">{s.title}</Link>
            </h2>
            <p className="mt-1.5 text-[12.5px] text-muted">{s.sourceName} · <span suppressHydrationWarning>{relativeTime(s.publishedAt, locale, t.common)}</span></p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button type="button" onClick={() => setState((st) => ({ ...st, saved: st.saved.filter((x) => x.id !== s.id) }))} aria-label={t.common.unsave} className="grid size-8 place-items-center rounded-full text-accent hover:bg-surface-2">
              <Bookmark className="size-4 fill-current" />
            </button>
            <OriginalLink article={{ url: s.url, isDemo: s.isDemo }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
