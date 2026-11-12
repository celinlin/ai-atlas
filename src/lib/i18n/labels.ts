import { countryName } from "@/lib/geo/countries";
import { industryBySlug, regionBySlug, topicBySlug, typeBySlug } from "@/lib/taxonomy";
import type { Locale } from "@/lib/types";
import { format } from "./dictionaries";

export const industryLabel = (slug: string, l: Locale) => industryBySlug.get(slug as never)?.[l] ?? slug;
export const typeLabel = (slug: string, l: Locale) => typeBySlug.get(slug as never)?.[l] ?? slug;
export const topicLabel = (slug: string, l: Locale) => topicBySlug.get(slug)?.[l] ?? slug.replace(/-/g, " ");
export const regionLabel = (slug: string, l: Locale) => regionBySlug.get(slug as never)?.[l] ?? slug;
export { countryName };

export function relativeTime(iso: string, l: Locale, t: { minutesAgo: string; hoursAgo: string; daysAgo: string; justNow: string }, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return t.justNow;
  if (m < 60) return format(t.minutesAgo, { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return format(t.hoursAgo, { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return format(t.daysAgo, { n: d });
  return new Date(iso).toLocaleDateString(l === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: d > 300 ? "numeric" : undefined });
}

export function formatDate(iso: string, l: Locale, withTime = false) {
  return new Date(iso).toLocaleString(l === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit", timeZoneName: "short" } : {}) });
}

export function formatNumber(n: number, l: Locale) {
  return new Intl.NumberFormat(l === "fr" ? "fr-FR" : "en-US").format(n);
}
