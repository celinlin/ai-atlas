import type { Article, IndustrySlug } from "@/lib/types";

/**
 * My AI Radar — explainable weighted recommender.
 * Every point an article earns is attributed to a human-readable reason, so the
 * UI can say *why* a story is in the feed. Embedding similarity can later be
 * added as one more weighted signal (see `semantic` below).
 */

export interface RadarPreferences {
  countries: string[];
  industries: IndustrySlug[];
  topics: string[];
}

export interface RadarSignals {
  savedIds: string[];
  /** Recently read articles (most recent first) — used for implicit affinity */
  history: { countries: string[]; industries: IndustrySlug[]; topics: string[] }[];
}

export type Reason =
  | { kind: "country"; value: string }
  | { kind: "industry"; value: IndustrySlug }
  | { kind: "topic"; value: string }
  | { kind: "affinity"; value: string }
  | { kind: "fresh" }
  | { kind: "quality" };

export interface Scored {
  article: Article;
  score: number;
  reasons: Reason[];
  breakdown: Record<string, number>;
}

export const WEIGHTS = {
  country: 3,
  industry: 2,
  topic: 1.5,
  affinity: 1.5,
  quality: 1.5,
  freshness: 2,
  freshnessHalfLifeHours: 48,
  diversityCountry: 0.6,
  diversityIndustry: 0.35,
  semantic: 0, // reserved for embedding similarity
};

export function hasPreferences(p: RadarPreferences): boolean {
  return p.countries.length + p.industries.length + p.topics.length > 0;
}

export function scoreArticle(a: Article, prefs: RadarPreferences, signals: RadarSignals, now = new Date()): Scored {
  const reasons: Reason[] = [];
  const breakdown: Record<string, number> = {};
  const ev = a.countries.filter((c) => c.role === "event").map((c) => c.code);

  const followedCountry = ev.find((c) => prefs.countries.includes(c));
  if (followedCountry) {
    breakdown.country = WEIGHTS.country;
    reasons.push({ kind: "country", value: followedCountry });
  }
  const followedIndustry = a.industries.find((i) => prefs.industries.includes(i));
  if (followedIndustry) {
    breakdown.industry = WEIGHTS.industry;
    reasons.push({ kind: "industry", value: followedIndustry });
  }
  const followedTopic = a.topics.find((t) => prefs.topics.includes(t));
  if (followedTopic) {
    breakdown.topic = WEIGHTS.topic;
    reasons.push({ kind: "topic", value: followedTopic });
  }

  // Implicit affinity from reading history (decays with position) and saves.
  const hist = signals.history.slice(0, 50);
  if (hist.length) {
    let aff = 0;
    let best: { v: string; w: number } | null = null;
    hist.forEach((h, idx) => {
      const decay = Math.pow(0.95, idx);
      for (const c of ev) if (h.countries.includes(c)) {
        aff += 0.5 * decay;
        if (!best || 0.5 * decay > best.w) best = { v: c, w: 0.5 * decay };
      }
      for (const i of a.industries) if (i !== "general" && h.industries.includes(i)) aff += 0.3 * decay;
      for (const t of a.topics) if (h.topics.includes(t)) aff += 0.3 * decay;
    });
    const affinity = Math.min(1, aff / 4) * WEIGHTS.affinity;
    if (affinity > 0.15) {
      breakdown.affinity = Math.round(affinity * 100) / 100;
      if (!followedCountry && best) reasons.push({ kind: "affinity", value: (best as { v: string }).v });
    }
  }

  breakdown.quality = Math.round(a.quality * WEIGHTS.quality * 100) / 100;
  const ageH = Math.max(0, (now.getTime() - new Date(a.publishedAt).getTime()) / 3600_000);
  breakdown.freshness = Math.round(WEIGHTS.freshness * Math.pow(0.5, ageH / WEIGHTS.freshnessHalfLifeHours) * 100) / 100;
  if (ageH < 12) reasons.push({ kind: "fresh" });
  if (a.quality >= 0.8 && reasons.length < 2) reasons.push({ kind: "quality" });

  const score = Object.values(breakdown).reduce((s, v) => s + v, 0);
  return { article: a, score, reasons, breakdown };
}

/** Score, then greedily re-rank with diversity penalties (MMR-style). */
export function recommend(articles: Article[], prefs: RadarPreferences, signals: RadarSignals, limit = 30, now = new Date()): Scored[] {
  const saved = new Set(signals.savedIds);
  const pool = articles.filter((a) => !saved.has(a.id)).map((a) => scoreArticle(a, prefs, signals, now));
  const picked: Scored[] = [];
  const countryCount = new Map<string, number>();
  const industryCount = new Map<string, number>();
  while (picked.length < limit && pool.length) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    pool.forEach((s, i) => {
      const c = s.article.countries.find((x) => x.role === "event")?.code;
      const ind = s.article.industries[0];
      const penalty = (c ? (countryCount.get(c) ?? 0) * WEIGHTS.diversityCountry : 0) + (industryCount.get(ind) ?? 0) * WEIGHTS.diversityIndustry;
      const v = s.score - penalty;
      if (v > bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    });
    const [s] = pool.splice(bestIdx, 1);
    const c = s.article.countries.find((x) => x.role === "event")?.code;
    if (c) countryCount.set(c, (countryCount.get(c) ?? 0) + 1);
    industryCount.set(s.article.industries[0], (industryCount.get(s.article.industries[0]) ?? 0) + 1);
    picked.push(s);
  }
  return picked;
}
