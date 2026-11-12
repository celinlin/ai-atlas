import type { Article, ArticleCountry, ContentType, IndustrySlug, Source } from "@/lib/types";
import { classifyGeography } from "./geo";
import { classifyContentType, classifyIndustries, classifyTopics, extractOrganizations, isAiRelated, qualityScore } from "./rules";
import { canonicalizeUrl } from "./dedupe";
import { extractiveSummary, shortHash, slugify, stripHtml } from "./text";

export interface RawItem {
  title: string;
  url: string;
  description?: string;
  publishedAt?: string | null;
  imageUrl?: string | null;
  language?: string;
  source: Source;
}

export interface LlmHook {
  (input: { title: string; description: string; publisher: string }): Promise<{
    summary: string;
    isAiRelated: boolean;
    eventCountries: ArticleCountry[];
    industries: IndustrySlug[];
    contentType: ContentType | null;
  } | null>;
}

export type ClassifyOutcome = { ok: true; article: Article } | { ok: false; reason: string };

/** Turns a raw feed item into a fully classified Article (or rejects it). */
export async function classifyItem(item: RawItem, opts: { llm?: LlmHook; now?: Date } = {}): Promise<ClassifyOutcome> {
  const now = opts.now ?? new Date();
  const title = stripHtml(item.title ?? "").trim();
  const body = stripHtml(item.description ?? "");
  if (!title || !item.url) return { ok: false, reason: "missing title or url" };

  // Publication date must come from the provider; we never invent one.
  const published = item.publishedAt ? new Date(item.publishedAt) : null;
  if (!published || Number.isNaN(published.getTime())) return { ok: false, reason: "missing or invalid publication date" };
  if (published.getTime() > now.getTime() + 6 * 3600_000) return { ok: false, reason: "publication date in the future" };

  if (!isAiRelated(title, body)) return { ok: false, reason: "not AI-related" };

  const geo = classifyGeography(title, body);
  const ind = classifyIndustries(title, body);
  const type = classifyContentType(title, body);
  let countries = geo.countries;
  let industries = ind.industries;
  let contentType = type.type;
  let summary = extractiveSummary(body) || "";
  let summarySource: Article["summarySource"] = "extractive";
  let method: Article["trace"]["method"] = "rules";
  const geoTrace = [...geo.trace];

  if (opts.llm) {
    const llm = await opts.llm({ title, description: body, publisher: item.source.name });
    if (llm) {
      if (!llm.isAiRelated) return { ok: false, reason: "not AI-related (LLM)" };
      if (llm.summary) {
        summary = llm.summary;
        summarySource = "llm";
      }
      if (llm.eventCountries.length) {
        const mentioned = countries.filter((c) => !llm.eventCountries.some((e) => e.code === c.code)).map((c) => ({ ...c, role: "mentioned" as const }));
        countries = [...llm.eventCountries, ...mentioned];
        geoTrace.push(`LLM review: event in ${llm.eventCountries.map((c) => c.code).join(", ")}`);
      }
      if (llm.industries.length) industries = llm.industries;
      if (llm.contentType) contentType = llm.contentType;
      method = "rules+llm";
    }
  }

  const canonicalUrl = canonicalizeUrl(item.url);
  const id = shortHash(canonicalUrl) + shortHash(title).slice(0, 3);
  return {
    ok: true,
    article: {
      id,
      slug: `${slugify(title) || "article"}-${id}`,
      title,
      summary,
      summarySource,
      url: item.url,
      canonicalUrl,
      imageUrl: item.imageUrl ?? null,
      language: item.language ?? "en",
      publishedAt: published.toISOString(),
      ingestedAt: now.toISOString(),
      source: item.source,
      countries,
      industries,
      contentType,
      topics: classifyTopics(title, body),
      organizations: extractOrganizations(title, body),
      quality: qualityScore({ title, body, sourceReliability: item.source.reliability, hasImage: !!item.imageUrl }),
      coverage: 1,
      status: summarySource === "llm" ? "summarized" : "classified",
      trace: { geo: geoTrace, industries: ind.trace, type: type.trace, method },
      isDemo: false,
    },
  };
}

export { canonicalizeUrl, isNearDuplicate, titleFingerprint } from "./dedupe";
