import type { RawItem } from "@/lib/classify";
import { fetchText } from "../http";
import type { NewsProvider, ProviderResult } from "./types";

/**
 * Credentialed providers. These follow the public API documentation of each
 * service but could not be exercised end-to-end without keys; they are
 * disabled unless the corresponding key is set.
 */

export const eventRegistryProvider: NewsProvider = {
  id: "eventregistry",
  label: "Event Registry (NewsAPI.ai)",
  enabled() {
    return process.env.EVENT_REGISTRY_API_KEY ? { enabled: true, reason: "EVENT_REGISTRY_API_KEY set" } : { enabled: false, reason: "Requires EVENT_REGISTRY_API_KEY" };
  },
  async fetch(): Promise<ProviderResult> {
    try {
      const body = await fetchText("https://eventregistry.org/api/v1/article/getArticles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: process.env.EVENT_REGISTRY_API_KEY,
          keyword: process.env.EVENT_REGISTRY_KEYWORD || "artificial intelligence",
          lang: ["eng", "fra"],
          articlesSortBy: "date",
          articlesCount: 100,
          resultType: "articles",
          dataType: ["news"],
        }),
      });
      const json = JSON.parse(body) as { articles?: { results?: Record<string, unknown>[] } };
      const items: RawItem[] = (json.articles?.results ?? []).map((r) => {
        const src = (r.source ?? {}) as Record<string, string>;
        return {
          title: String(r.title ?? ""),
          url: String(r.url ?? ""),
          description: String(r.body ?? "").slice(0, 1200),
          publishedAt: (r.dateTimePub as string) || (r.dateTime as string) || null,
          imageUrl: (r.image as string) || null,
          language: r.lang === "fra" ? "fr" : "en",
          source: { id: `er-${src.uri ?? "unknown"}`, name: src.title ?? src.uri ?? "Unknown", url: `https://${src.uri ?? ""}`, country: null, kind: "eventregistry", reliability: 0.6 },
        };
      });
      return { items, errors: [] };
    } catch (e) {
      return { items: [], errors: [`Event Registry: ${(e as Error).message}`] };
    }
  },
};

export const newsApiProvider: NewsProvider = {
  id: "newsapi",
  label: "NewsAPI.org",
  enabled() {
    return process.env.NEWSAPI_KEY ? { enabled: true, reason: "NEWSAPI_KEY set" } : { enabled: false, reason: "Requires NEWSAPI_KEY" };
  },
  async fetch(): Promise<ProviderResult> {
    try {
      const q = encodeURIComponent(process.env.NEWSAPI_QUERY || '"artificial intelligence" OR "generative AI"');
      const body = await fetchText(`https://newsapi.org/v2/everything?q=${q}&sortBy=publishedAt&pageSize=100&language=en`, { headers: { "X-Api-Key": process.env.NEWSAPI_KEY! } });
      const json = JSON.parse(body) as { articles?: Record<string, unknown>[] };
      const items: RawItem[] = (json.articles ?? []).map((r) => {
        const src = (r.source ?? {}) as Record<string, string>;
        const host = (() => {
          try {
            return new URL(String(r.url)).origin;
          } catch {
            return "";
          }
        })();
        return {
          title: String(r.title ?? ""),
          url: String(r.url ?? ""),
          description: String(r.description ?? ""),
          publishedAt: (r.publishedAt as string) || null,
          imageUrl: (r.urlToImage as string) || null,
          language: "en",
          source: { id: `newsapi-${src.id ?? host.replace(/\W+/g, "-")}`, name: src.name ?? host, url: host, country: null, kind: "newsapi", reliability: 0.6 },
        };
      });
      return { items, errors: [] };
    } catch (e) {
      return { items: [], errors: [`NewsAPI: ${(e as Error).message}`] };
    }
  },
};
