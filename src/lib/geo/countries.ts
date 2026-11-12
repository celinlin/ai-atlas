import raw from "@/data/countries.json";
import type { Locale, RegionSlug } from "@/lib/types";

export interface Country {
  code: string;
  num: string | null;
  a3: string;
  en: string;
  fr: string;
  official: string;
  region: RegionSlug | "other";
  sub: string;
  ll: [number, number];
  cap: string | null;
  dem: string[];
  alt: string[];
  area: number;
  ind: boolean;
}

export const COUNTRIES = raw as unknown as Country[];
export const countryByCode = new Map(COUNTRIES.map((c) => [c.code, c]));
/** ISO 3166 numeric (as unpadded string) → alpha-2, used to join map polygons. */
export const codeByNumeric = new Map(COUNTRIES.filter((c) => c.num).map((c) => [String(Number(c.num)), c.code]));
/** Map polygons in Natural Earth without an ISO numeric id. */
export const codeByMapName: Record<string, string> = { Kosovo: "XK" };

export function countryName(code: string, locale: Locale = "en"): string {
  const c = countryByCode.get(code.toUpperCase());
  if (!c) return code;
  return locale === "fr" ? c.fr : c.en;
}

export function isCountryCode(code: string | null | undefined): code is string {
  return !!code && countryByCode.has(code.toUpperCase());
}

/** Regional-indicator flag emoji, used sparingly as a compact visual cue. */
export function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/i.test(code)) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map((ch) => 0x1f1a5 + ch.charCodeAt(0)));
}

/**
 * IMF "advanced economies" (2024). Everything else counts as an emerging or
 * developing market for the Emerging Markets Explorer achievement.
 */
export const ADVANCED_ECONOMIES = new Set([
  "AD", "AU", "AT", "BE", "CA", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HK", "IS", "IE", "IL", "IT", "JP",
  "KR", "LV", "LT", "LU", "MO", "MT", "NL", "NZ", "NO", "PT", "PR", "SM", "SG", "SK", "SI", "ES", "SE", "CH", "TW", "GB", "US",
]);
