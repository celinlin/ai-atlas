"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NewsCard, NewsCardSkeleton } from "@/components/news/news-card";
import { SectionHeader } from "@/components/ui/section";
import { useI18n } from "@/lib/i18n/client";
import { useAtlas, useHydrated, getState } from "@/lib/store/atlas-store";
import type { Article } from "@/lib/types";
import type { Reason } from "@/lib/recommend/score";

export interface RadarItem {
  article: Article;
  score: number;
  reasons: Reason[];
  breakdown: Record<string, number>;
}

export async function fetchRadar(limit: number): Promise<RadarItem[]> {
  const s = getState();
  const res = await fetch("/api/radar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      countries: s.prefs.countries,
      industries: s.prefs.industries,
      topics: s.prefs.topics,
      savedIds: s.saved.map((x) => x.id),
      history: s.explorer.reads.slice(0, 50).map((r) => ({ countries: r.countries, industries: r.industries, topics: [] })),
      limit,
    }),
  });
  if (!res.ok) throw new Error("radar");
  return (await res.json()).items;
}

/** Homepage "For you" strip — only shown with personalization signals. */
export function ForYouStrip() {
  const { t } = useI18n();
  const hydrated = useHydrated();
  const prefsKey = useAtlas((s) => [...s.prefs.countries, ...s.prefs.industries, ...s.prefs.topics].join(","));
  const [items, setItems] = useState<RadarItem[] | null>(null);
  useEffect(() => {
    if (!hydrated || !prefsKey) return;
    fetchRadar(4).then(setItems).catch(() => setItems([]));
  }, [hydrated, prefsKey]);

  if (!hydrated) return null;
  if (!prefsKey)
    return (
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow mb-1">{t.home.forYou}</p>
          <p className="font-display text-xl text-ink">{t.home.forYouEmpty}</p>
        </div>
        <Link href="/radar" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-bg hover:bg-ink/90">
          {t.home.setUpRadar}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  return (
    <section>
      <SectionHeader title={t.home.forYou} href="/radar" linkLabel={t.nav.radar} />
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items ? items.map((i) => <NewsCard key={i.article.id} article={i.article} />) : [0, 1, 2, 3].map((i) => <NewsCardSkeleton key={i} />)}
      </div>
    </section>
  );
}
