import { ADVANCED_ECONOMIES, countryByCode } from "@/lib/geo/countries";
import { INDUSTRIES, REGIONS } from "@/lib/taxonomy";
import type { ContentType, IndustrySlug, Locale, RegionSlug } from "@/lib/types";

/**
 * AI Explorer Passport. Progress is earned by *reading*: opening a country's
 * intelligence panel stamps the country; reading a story counts towards
 * industries and achievements; opening the original source is rewarded.
 */

export interface ReadRecord {
  id: string;
  at: string;
  countries: string[];
  industries: IndustrySlug[];
  type: ContentType;
}

export interface ExplorerState {
  countries: Record<string, string>; // code → first explored at
  industries: Record<string, string>;
  reads: ReadRecord[];
  sourcesOpened: number;
}

export const EMPTY_EXPLORER: ExplorerState = { countries: {}, industries: {}, reads: [], sourcesOpened: 0 };

type L = Record<Locale, string>;
export interface Achievement {
  slug: string;
  name: L;
  description: L;
  progress: (s: ExplorerState) => { current: number; target: number };
}

const regionsOf = (codes: string[]) => new Set(codes.map((c) => countryByCode.get(c)?.region).filter((r) => r && r !== "other"));
const readsOf = (s: ExplorerState, pred: (r: ReadRecord) => boolean) => s.reads.filter(pred).length;

export const ACHIEVEMENTS: Achievement[] = [
  { slug: "first-stamp", name: { en: "First Stamp", fr: "Premier tampon" }, description: { en: "Open the intelligence panel of any country.", fr: "Ouvrez le panneau d'un pays." }, progress: (s) => ({ current: Object.keys(s.countries).length, target: 1 }) },
  { slug: "global-explorer", name: { en: "Global Explorer", fr: "Explorateur mondial" }, description: { en: "Explore countries in every world region.", fr: "Explorez des pays dans chaque région du monde." }, progress: (s) => ({ current: regionsOf(Object.keys(s.countries)).size, target: REGIONS.length }) },
  { slug: "cartographer", name: { en: "Cartographer", fr: "Cartographe" }, description: { en: "Explore 25 countries.", fr: "Explorez 25 pays." }, progress: (s) => ({ current: Object.keys(s.countries).length, target: 25 }) },
  { slug: "emerging-markets", name: { en: "Emerging Markets Explorer", fr: "Explorateur des marchés émergents" }, description: { en: "Explore 10 emerging and developing economies.", fr: "Explorez 10 économies émergentes et en développement." }, progress: (s) => ({ current: Object.keys(s.countries).filter((c) => !ADVANCED_ECONOMIES.has(c)).length, target: 10 }) },
  { slug: "healthcare-explorer", name: { en: "Healthcare AI Explorer", fr: "Explorateur IA & santé" }, description: { en: "Read 5 healthcare stories.", fr: "Lisez 5 articles santé." }, progress: (s) => ({ current: readsOf(s, (r) => r.industries.includes("healthcare")), target: 5 }) },
  { slug: "research-discoverer", name: { en: "Research Discoverer", fr: "Découvreur de recherche" }, description: { en: "Read 5 research stories.", fr: "Lisez 5 articles de recherche." }, progress: (s) => ({ current: readsOf(s, (r) => r.type === "research"), target: 5 }) },
  { slug: "policy-watcher", name: { en: "Policy Watcher", fr: "Veilleur réglementaire" }, description: { en: "Read regulation stories from 3 different countries.", fr: "Lisez des articles réglementaires de 3 pays." }, progress: (s) => ({ current: new Set(s.reads.filter((r) => r.type === "regulation").flatMap((r) => r.countries)).size, target: 3 }) },
  { slug: "polymath", name: { en: "Cross-Sector Polymath", fr: "Polymathe intersectoriel" }, description: { en: "Discover 8 industries.", fr: "Découvrez 8 secteurs." }, progress: (s) => ({ current: Object.keys(s.industries).filter((i) => i !== "general").length, target: 8 }) },
  { slug: "source-seeker", name: { en: "Source Seeker", fr: "Chercheur de sources" }, description: { en: "Open 10 original publications.", fr: "Ouvrez 10 publications originales." }, progress: (s) => ({ current: s.sourcesOpened, target: 10 }) },
];

export function achievementStatus(s: ExplorerState) {
  return ACHIEVEMENTS.map((a) => {
    const p = a.progress(s);
    return { ...a, current: Math.min(p.current, p.target), target: p.target, unlocked: p.current >= p.target };
  });
}

/** ISO-8601 week key, e.g. "2026-W46". */
export function isoWeek(d = new Date()): { key: string; start: Date; end: Date } {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (day - 1)));
  const end = new Date(start.getTime() + 7 * 86400000);
  return { key: `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`, start, end };
}

export interface WeeklyChallenge {
  key: string;
  title: L;
  current: number;
  target: number;
  href: string;
}

/** Deterministic weekly challenge, rotating through regions and industries. */
export function weeklyChallenge(s: ExplorerState, now = new Date()): WeeklyChallenge {
  const { key, start, end } = isoWeek(now);
  const n = Number(key.slice(-2)) + Number(key.slice(0, 4));
  const inWeek = s.reads.filter((r) => {
    const t = new Date(r.at).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
  if (n % 2 === 0) {
    const region = REGIONS[n % REGIONS.length];
    const codes = new Set(inWeek.flatMap((r) => r.countries).filter((c) => countryByCode.get(c)?.region === region.slug));
    return { key, title: { en: `Read stories from 3 countries in ${region.en}`, fr: `Lisez des articles de 3 pays — ${region.fr}` }, current: Math.min(3, codes.size), target: 3, href: `/news?region=${region.slug as RegionSlug}` };
  }
  const pool = INDUSTRIES.filter((i) => i.slug !== "general");
  const ind = pool[n % pool.length];
  const countries = new Set(inWeek.filter((r) => r.industries.includes(ind.slug)).flatMap((r) => r.countries));
  return { key, title: { en: `${ind.en}: read stories from 2 different countries`, fr: `${ind.fr} : lisez des articles de 2 pays différents` }, current: Math.min(2, countries.size), target: 2, href: `/industries/${ind.slug}` };
}
