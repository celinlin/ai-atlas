import { XMLParser } from "fast-xml-parser";
import type { RawItem } from "@/lib/classify";
import { configuredFeeds, type FeedConfig } from "../sources";
import { fetchText } from "../http";
import type { NewsProvider, ProviderResult } from "./types";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", textNodeName: "#text", processEntities: true, htmlEntities: true });

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") return text((v as Record<string, unknown>)["#text"] ?? "");
  return "";
}
const arr = <T,>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Parses RSS 2.0, RSS 1.0 (RDF) and Atom documents into raw items. */
export function parseFeed(xml: string, cfg: FeedConfig): RawItem[] {
  const doc = parser.parse(xml);
  const out: RawItem[] = [];
  const rssItems = arr(doc?.rss?.channel?.item ?? doc?.["rdf:RDF"]?.item);
  for (const it of rssItems as Record<string, unknown>[]) {
    const link = text(it.link) || text((it.guid as Record<string, unknown>)?.["#text"] ?? it.guid);
    const media = (it["media:content"] ?? it["media:thumbnail"] ?? it.enclosure) as Record<string, string> | Record<string, string>[] | undefined;
    const img = arr(media).find((m) => m?.["@url"] && (!m["@type"] || String(m["@type"]).startsWith("image")))?.["@url"] ?? null;
    out.push({
      title: text(it.title),
      url: link,
      description: text(it.description) || text(it["content:encoded"]),
      publishedAt: text(it.pubDate) || text(it["dc:date"]) || null,
      imageUrl: img,
      language: cfg.language,
      source: cfg.source,
    });
  }
  const entries = arr(doc?.feed?.entry) as Record<string, unknown>[];
  for (const e of entries) {
    const links = arr(e.link as Record<string, string> | Record<string, string>[]);
    const link = links.find((l) => !l["@rel"] || l["@rel"] === "alternate")?.["@href"] ?? "";
    out.push({
      title: text(e.title),
      url: link,
      description: text(e.summary) || text(e.content),
      publishedAt: text(e.published) || text(e.updated) || null,
      imageUrl: null,
      language: cfg.language,
      source: cfg.source,
    });
  }
  return out;
}

export const rssProvider: NewsProvider = {
  id: "rss",
  label: "RSS / Atom feeds",
  enabled() {
    if (process.env.INGEST_RSS === "off") return { enabled: false, reason: "Disabled with INGEST_RSS=off" };
    return { enabled: true, reason: `${configuredFeeds().length} feeds configured (no key required)` };
  },
  async fetch(): Promise<ProviderResult> {
    const feeds = configuredFeeds();
    const results = await Promise.allSettled(feeds.map(async (f) => parseFeed(await fetchText(f.feedUrl), f)));
    const items: RawItem[] = [];
    const errors: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") items.push(...r.value.slice(0, 60));
      else errors.push(`${feeds[i].source.name}: ${(r.reason as Error)?.message ?? r.reason}`);
    });
    return { items, errors };
  },
};
