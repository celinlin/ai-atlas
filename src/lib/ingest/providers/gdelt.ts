import type { RawItem } from "@/lib/classify";
import { codeByFips } from "../fips";
import { fetchText } from "../http";
import type { NewsProvider, ProviderResult } from "./types";

/**
 * GDELT DOC 2.0 API (free, no key). Returns article URLs, titles and the
 * publisher's country (`sourcecountry`). That field describes the PUBLISHER and
 * is stored on the Source only — event geography comes from the classifier.
 */
interface GdeltArticle {
  url: string;
  title: string;
  seendate: string; // 20250101T120000Z
  domain: string;
  language: string;
  sourcecountry: string;
  socialimage?: string;
}

export function parseGdeltDate(s: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null;
}

const LANGS: Record<string, string> = { English: "en", French: "fr", Spanish: "es", German: "de", Portuguese: "pt", Italian: "it" };

export function mapGdelt(articles: GdeltArticle[]): RawItem[] {
  return articles.map((a) => ({
    title: a.title,
    url: a.url,
    // GDELT does not provide a description; classification relies on the headline.
    description: "",
    publishedAt: parseGdeltDate(a.seendate),
    imageUrl: a.socialimage || null,
    language: LANGS[a.language] ?? "en",
    source: {
      id: `gdelt-${a.domain}`,
      name: a.domain,
      url: `https://${a.domain}`,
      country: codeByFips(a.sourcecountry),
      kind: "gdelt",
      reliability: 0.55,
    },
  }));
}

export const gdeltProvider: NewsProvider = {
  id: "gdelt",
  label: "GDELT DOC 2.0",
  enabled() {
    if (process.env.INGEST_GDELT === "off") return { enabled: false, reason: "Disabled with INGEST_GDELT=off" };
    return { enabled: true, reason: "Public API, no key required" };
  },
  async fetch(): Promise<ProviderResult> {
    const query = process.env.GDELT_QUERY || '("artificial intelligence" OR "generative AI" OR "machine learning") sourcelang:english';
    const timespan = process.env.GDELT_TIMESPAN || "2h";
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=150&sort=datedesc&timespan=${timespan}`;
    try {
      const body = await fetchText(url, { timeoutMs: 30_000 });
      const json = JSON.parse(body) as { articles?: GdeltArticle[] };
      return { items: mapGdelt(json.articles ?? []), errors: [] };
    } catch (e) {
      return { items: [], errors: [`GDELT: ${(e as Error).message}`] };
    }
  },
};
