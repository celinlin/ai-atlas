import { COUNTRIES, countryByCode } from "@/lib/geo/countries";
import type { ArticleCountry } from "@/lib/types";
import { escapeRegex } from "./text";

/**
 * Rules-based geographic relevance classifier.
 *
 * It answers "where is this AI development happening?" from the article text
 * only. The publisher's country is deliberately NOT an input, so a London
 * outlet reporting on a Nairobi deployment is attributed to Kenya, not the UK.
 */

interface Pattern {
  code: string;
  re: RegExp;
  weight: number;
  label: string;
}

// Major AI hubs and cities that commonly locate a story without naming the country.
const CITIES: Record<string, string[]> = {
  US: ["Silicon Valley", "San Francisco", "Seattle", "New York", "Boston", "Austin", "Los Angeles", "Mountain View", "Palo Alto", "Menlo Park", "Redmond", "Cupertino", "Pittsburgh", "Washington, D.C.", "Capitol Hill", "the White House", "Pentagon", "California", "Texas", "Arizona"],
  GB: ["London", "Cambridge, UK", "Oxford", "Manchester", "Edinburgh", "Bletchley", "Westminster", "Downing Street", "Scotland", "Wales", "England"],
  FR: ["Paris", "Lyon", "Toulouse", "Grenoble", "Marseille", "Saclay", "Élysée", "Elysee", "Bercy"],
  DE: ["Berlin", "Munich", "München", "Hamburg", "Frankfurt", "Stuttgart", "Heidelberg", "Bundestag"],
  CN: ["Beijing", "Shanghai", "Shenzhen", "Hangzhou", "Guangzhou", "Pékin", "Chengdu", "Wuhan", "Nanjing"],
  IN: ["Bengaluru", "Bangalore", "Mumbai", "New Delhi", "Hyderabad", "Chennai", "Pune"],
  JP: ["Tokyo", "Osaka", "Kyoto", "Yokohama"],
  KR: ["Seoul", "Busan", "Pangyo"],
  CA: ["Toronto", "Montreal", "Montréal", "Vancouver", "Ottawa", "Quebec", "Québec", "Edmonton", "Waterloo, Ontario"],
  IL: ["Tel Aviv", "Jerusalem", "Haifa"],
  AE: ["Dubai", "Abu Dhabi"],
  SA: ["Riyadh", "Jeddah", "NEOM"],
  QA: ["Doha"],
  SG: ["Singapore"],
  KE: ["Nairobi", "Mombasa"],
  NG: ["Lagos", "Abuja"],
  ZA: ["Johannesburg", "Cape Town", "Pretoria"],
  EG: ["Cairo"],
  MA: ["Casablanca", "Rabat"],
  RW: ["Kigali"],
  GH: ["Accra"],
  BR: ["São Paulo", "Sao Paulo", "Rio de Janeiro", "Brasília", "Brasilia"],
  MX: ["Mexico City", "Monterrey", "Guadalajara"],
  AR: ["Buenos Aires"],
  CL: ["Santiago de Chile"],
  CO: ["Bogotá", "Bogota", "Medellín", "Medellin"],
  AU: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
  NZ: ["Auckland", "Wellington"],
  NL: ["Amsterdam", "Eindhoven", "Rotterdam", "The Hague"],
  CH: ["Zurich", "Zürich", "Geneva", "Genève", "Lausanne"],
  SE: ["Stockholm", "Gothenburg"],
  FI: ["Helsinki"],
  NO: ["Oslo"],
  DK: ["Copenhagen"],
  EE: ["Tallinn"],
  PL: ["Warsaw", "Kraków", "Krakow"],
  ES: ["Madrid", "Barcelona"],
  IT: ["Rome", "Milan", "Turin"],
  PT: ["Lisbon", "Porto"],
  IE: ["Dublin"],
  TW: ["Taipei", "Hsinchu"],
  VN: ["Hanoi", "Ho Chi Minh City"],
  ID: ["Jakarta"],
  MY: ["Kuala Lumpur"],
  TH: ["Bangkok"],
  PH: ["Manila"],
  PK: ["Karachi", "Lahore", "Islamabad"],
  BD: ["Dhaka"],
  TR: ["Istanbul", "Ankara"],
  UA: ["Kyiv", "Kiev"],
  RU: ["Moscow", "Saint Petersburg"],
};

// Proper nouns that are dangerous as bare matches. They still match when the
// surrounding text makes the country reading clear (see CONTEXT_REQUIRED).
const CONTEXT_REQUIRED = new Set(["GE", "JO", "TD", "CG", "CD", "GN", "DM", "NE", "TG"]);
const SKIP_TERMS = new Set(["Georgia", "Jordan", "Chad", "Guinea", "Niger", "Dominica", "Togo", "Congo", "American", "Indian", "Turkey", "Mali", "Malian", "Sudan"]);

const EXTRA_NAMES: Record<string, string[]> = {
  US: ["United States", "U.S.", "USA", "U.S.A.", "États-Unis", "Etats-Unis", "America's", "Americans", "American government", "American companies", "US government", "US-based", "U.S.-based"],
  GB: ["United Kingdom", "U.K.", "UK", "Britain", "Royaume-Uni", "British"],
  KR: ["South Korea", "Corée du Sud", "Korean"],
  KP: ["North Korea", "Corée du Nord"],
  AE: ["UAE", "Emirates", "Émirats arabes unis", "Emirati"],
  CN: ["China", "Chinese", "PRC", "Chine", "chinois", "chinoise"],
  TW: ["Taiwan", "Taïwan", "Taiwanese"],
  RU: ["Russia", "Russian", "Russie"],
  CZ: ["Czechia", "Czech Republic", "Tchéquie"],
  TR: ["Türkiye", "Turkish", "Turquie"],
  IN: ["India", "Indian government", "Indian startups", "Indian startup", "Indian companies", "Inde", "indien", "indienne"],
  CD: ["DRC", "Democratic Republic of the Congo", "RDC"],
  NL: ["Netherlands", "Dutch", "Pays-Bas", "néerlandais"],
  CI: ["Ivory Coast", "Côte d'Ivoire", "Ivorian", "ivoirien"],
  SA: ["Saudi Arabia", "Saudi", "Arabie saoudite", "saoudien"],
  VA: ["Vatican"],
};

function buildPatterns(): Pattern[] {
  // term → candidate countries. Shared terms ("French" → FR, TF, PF…) resolve
  // to the country whose own name it is, else the largest independent state.
  const entries = new Map<string, { code: string; weight: number; label: string; ci: boolean }[]>();
  const add = (code: string, term: string, weight: number, caseInsensitive = false) => {
    if (!term || term.length < 2 || SKIP_TERMS.has(term)) return;
    const key = caseInsensitive ? term.toLowerCase() : term;
    const list = entries.get(key) ?? [];
    if (list.some((e) => e.code === code)) return;
    list.push({ code, weight, label: term, ci: caseInsensitive });
    entries.set(key, list);
  };
  for (const c of COUNTRIES) {
    const names = new Set([c.en, c.fr, ...(EXTRA_NAMES[c.code] ?? [])]);
    if (c.official.length < 40) names.add(c.official);
    for (const a of c.alt) if (/^[A-Z]/.test(a) && a.length > 4 && !/\b(of|the|and)\b/i.test(a)) names.add(a);
    for (const n of names) add(c.code, n, 1);
    for (const d of c.dem) {
      if (/^[A-Z]/.test(d)) add(c.code, d, 0.7);
      // French adjectives are lower-case ("une start-up française")
      const lower = d.toLowerCase();
      if (lower.length >= 6 && !LOWER_SKIP.has(lower)) add(c.code, lower, 0.6);
    }
    if (c.cap && c.cap.length > 3 && !SKIP_TERMS.has(c.cap)) add(c.code, c.cap, 0.8);
    for (const city of CITIES[c.code] ?? []) add(c.code, city, 0.8);
  }
  const out: Pattern[] = [];
  for (const [term, list] of entries) {
    let pick = list[0];
    if (list.length > 1) {
      const own = list.find((e) => {
        const c = countryByCode.get(e.code)!;
        return c.en === e.label || c.fr === e.label || (EXTRA_NAMES[e.code] ?? []).includes(e.label);
      });
      pick = own ?? [...list].sort((a, b) => {
        const ca = countryByCode.get(a.code)!;
        const cb = countryByCode.get(b.code)!;
        return Number(cb.ind) - Number(ca.ind) || cb.area - ca.area;
      })[0];
    }
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(term)}(?![\\p{L}\\p{N}])`, pick.ci ? "giu" : "gu");
    out.push({ code: pick.code, re, weight: pick.weight, label: pick.label });
  }
  return out;
}

// Lower-case forms that are ordinary words in English or French.
const LOWER_SKIP = new Set(["polish", "american", "indian", "turkish", "guinean", "dominican", "malian"]);

let PATTERNS: Pattern[] | null = null;

// Prevent "Latin American", "South American", "North American" etc. from
// counting as the United States; "New Mexico" as Mexico; "Papua New Guinea" etc.
const NEGATIVE_CONTEXT: [RegExp, string][] = [
  [/\b(Latin|South|Central|North) Americans?\b/g, ""],
  [/\bNew Mexico\b/g, ""],
  [/\bNew South Wales\b/g, "Australia"],
  [/\bIndian Ocean\b/g, ""],
  [/\bAmerican Samoa\b/g, ""],
  [/\bPapua New Guinea\b/g, "PNG_"],
  [/\bEquatorial Guinea\b/g, "EQG_"],
  [/\bGuinea-Bissau\b/g, "GNB_"],
  [/\bUS\$/g, "USD"],
];

export interface GeoResult {
  countries: ArticleCountry[];
  trace: string[];
}

export function classifyGeography(title: string, body: string): GeoResult {
  PATTERNS ??= buildPatterns();
  const clean = (s: string) => NEGATIVE_CONTEXT.reduce((acc, [re, rep]) => acc.replace(re, rep), s);
  const t = clean(title);
  const b = clean(body);
  const scores = new Map<string, { score: number; hits: Set<string>; inTitle: boolean }>();

  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    const titleHits = t.match(p.re)?.length ?? 0;
    p.re.lastIndex = 0;
    const bodyHits = Math.min(b.match(p.re)?.length ?? 0, 3);
    if (!titleHits && !bodyHits) continue;
    const entry = scores.get(p.code) ?? { score: 0, hits: new Set<string>(), inTitle: false };
    entry.score += p.weight * (titleHits * 3 + bodyHits);
    entry.hits.add(titleHits ? `“${p.label}” in headline` : `“${p.label}” in text`);
    if (titleHits) entry.inTitle = true;
    scores.set(p.code, entry);
  }

  // Context-required countries (ambiguous names) need explicit framing.
  const ctx = (code: string, name: string) => new RegExp(`\\b(in|from|of|across|government of)\\s+${name}\\b|\\b${name}'s\\b`).test(`${t} ${b}`);
  const ambiguousNames: Record<string, string> = { GE: "Georgia", JO: "Jordan", TD: "Chad", CG: "Congo", CD: "Congo", GN: "Guinea", DM: "Dominica", NE: "Niger", TG: "Togo" };
  for (const code of CONTEXT_REQUIRED) {
    const name = ambiguousNames[code];
    if (name && ctx(code, name) && !(code === "GE" && /\bAtlanta\b|\bGeorgia Tech\b/.test(`${t} ${b}`))) {
      if (code === "CG" || code === "CD") continue; // too ambiguous without "DRC"/"Republic of"
      const entry = scores.get(code) ?? { score: 0, hits: new Set<string>(), inTitle: false };
      entry.score += 1.5;
      entry.hits.add(`“${name}” with geographic framing`);
      scores.set(code, entry);
    }
  }

  const ranked = [...scores.entries()].filter(([code]) => countryByCode.has(code)).sort((a, b) => b[1].score - a[1].score);
  if (!ranked.length) return { countries: [], trace: ["No specific country detected — treated as a global story"] };

  const top = ranked[0][1].score;
  const countries: ArticleCountry[] = [];
  const trace: string[] = [];
  for (const [code, e] of ranked.slice(0, 8)) {
    const isEvent = (e.inTitle || e.score >= 1.5) && e.score >= top * 0.45 && countries.filter((c) => c.role === "event").length < 4;
    const role = isEvent ? "event" : "mentioned";
    countries.push({ code, role, confidence: Math.min(1, Math.round((e.score / 4) * 100) / 100) });
    trace.push(`${code} (${role}): ${[...e.hits].slice(0, 3).join(", ")}`);
  }
  return { countries, trace };
}
