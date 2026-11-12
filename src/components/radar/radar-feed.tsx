"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NewsCard, NewsCardSkeleton } from "@/components/news/news-card";
import { useI18n } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/dictionaries";
import { countryName, industryLabel, topicLabel } from "@/lib/i18n/labels";
import { useAtlas, useHydrated } from "@/lib/store/atlas-store";
import type { Article } from "@/lib/types";
import type { Reason } from "@/lib/recommend/score";
import { fetchRadar, type RadarItem } from "./for-you";

export function ReasonLine({ reasons }: { reasons: Reason[] }) {
  const { t, locale } = useI18n();
  if (!reasons.length) return null;
  const text = reasons.slice(0, 2).map((r) => {
    switch (r.kind) {
      case "country":
        return format(t.radar.reasons.country, { v: countryName(r.value, locale) });
      case "industry":
        return format(t.radar.reasons.industry, { v: industryLabel(r.value, locale) });
      case "topic":
        return format(t.radar.reasons.topic, { v: topicLabel(r.value, locale) });
      case "affinity":
        return format(t.radar.reasons.affinity, { v: countryName(r.value, locale) });
      case "fresh":
        return t.radar.reasons.fresh;
      case "quality":
        return t.radar.reasons.quality;
    }
  });
  return (
    <p className="mb-2 inline-flex items-center gap-1.5 text-[12px] text-accent-2">
      <span className="size-1.5 rounded-full bg-accent" aria-hidden />
      <span className="sr-only">{t.radar.why}: </span>
      {text.join(" · ")}
    </p>
  );
}

/** Personalized, explainable ranking from /api/radar. */
export function RadarFeed({ limit = 30, empty }: { limit?: number; empty?: React.ReactNode }) {
  const hydrated = useHydrated();
  const key = useAtlas((s) => [...s.prefs.countries, "|", ...s.prefs.industries, "|", ...s.prefs.topics, "|", s.saved.length].join(","));
  const hasPrefs = useAtlas((s) => s.prefs.countries.length + s.prefs.industries.length + s.prefs.topics.length > 0);
  const [result, setResult] = useState<{ key: string; items: RadarItem[] | null; error: boolean }>({ key: "", items: null, error: false });
  const { t } = useI18n();
  const reqKey = `${key}#${limit}`;
  const items = result.items;
  const error = result.key === reqKey && result.error;

  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    fetchRadar(limit)
      .then((its) => live && setResult({ key: reqKey, items: its, error: false }))
      .catch(() => live && setResult((r) => ({ key: reqKey, items: r.items, error: true })));
    return () => {
      live = false;
    };
  }, [hydrated, reqKey, limit]);

  if (!hydrated || (!items && !error)) return <div className="grid gap-10 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <NewsCardSkeleton key={i} />)}</div>;
  if (error) return <p className="text-muted">{t.common.error}</p>;
  if (!hasPrefs && empty) return <>{empty}</>;
  return (
    <div className="grid gap-x-10 md:grid-cols-2">
      {items!.map((i) => (
        <div key={i.article.id} className="border-b border-line py-6">
          <ReasonLine reasons={i.reasons} />
          <NewsCard article={i.article} />
        </div>
      ))}
    </div>
  );
}

/** Stories from followed countries OR followed industries. */
export function FollowingFeed() {
  const { t } = useI18n();
  const hydrated = useHydrated();
  const prefs = useAtlas((s) => s.prefs);
  const [items, setItems] = useState<Article[] | null>(null);
  const key = [...prefs.countries, "|", ...prefs.industries, "|", ...prefs.topics].join(",");

  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    const reqs: Promise<Article[]>[] = [];
    const get = (qs: string) => fetch(`/api/articles?${qs}&limit=40`).then((r) => r.json()).then((d) => d.items as Article[]);
    if (prefs.countries.length) reqs.push(get(`country=${prefs.countries.join(",")}`));
    if (prefs.industries.length) reqs.push(get(`industry=${prefs.industries.join(",")}`));
    if (prefs.topics.length) reqs.push(get(`topic=${prefs.topics.join(",")}`));
    Promise.all(reqs).then((lists) => {
      if (!live) return;
      const m = new Map<string, Article>();
      for (const a of lists.flat()) m.set(a.id, a);
      setItems([...m.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, key]);

  if (hydrated && !prefs.countries.length && !prefs.industries.length && !prefs.topics.length)
    return (
      <div className="rounded-2xl border border-dashed border-line-strong p-8 text-center">
        <p className="font-display text-xl text-ink">{t.news.followingEmpty}</p>
        <Link href="/radar" className="mt-4 inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-bg">{t.news.followingCta}</Link>
      </div>
    );
  if (!hydrated || !items) return <div className="grid gap-10 md:grid-cols-2">{[0, 1].map((i) => <NewsCardSkeleton key={i} />)}</div>;
  if (!items.length) return <p className="py-10 text-muted">{t.common.noResults}</p>;
  return (
    <div className="grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
      {items.map((a) => <NewsCard key={a.id} article={a} />)}
    </div>
  );
}
