import { countryByCode, COUNTRIES } from "@/lib/geo/countries";

// GDELT `sourcecountry` is a country NAME (e.g. "United States", "United Kingdom").
const ALIASES: Record<string, string> = {
  "united states": "US", "united kingdom": "GB", "south korea": "KR", "north korea": "KP", russia: "RU", "czech republic": "CZ",
  "ivory coast": "CI", "democratic republic of the congo": "CD", "republic of the congo": "CG", vietnam: "VN", taiwan: "TW", iran: "IR",
  syria: "SY", laos: "LA", turkey: "TR", "hong kong": "HK", macau: "MO", burma: "MM", "the netherlands": "NL",
};
const byName = new Map(COUNTRIES.map((c) => [c.en.toLowerCase(), c.code]));

export function codeByFips(name: string | undefined | null): string | null {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(n) && countryByCode.has(n.toUpperCase())) return n.toUpperCase();
  return ALIASES[n] ?? byName.get(n) ?? null;
}
