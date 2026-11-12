// Core domain types shared by the data layer, ingestion pipeline and UI.

export type Locale = "en" | "fr";

export type RegionSlug = "north-america" | "latin-america" | "europe" | "africa" | "mena" | "asia" | "oceania";

export type IndustrySlug =
  | "healthcare" | "finance" | "education" | "manufacturing" | "retail" | "energy" | "transportation"
  | "government" | "marketing" | "real-estate" | "cybersecurity" | "agriculture" | "media" | "telecom"
  | "defense" | "legal" | "science" | "general";

export type ContentType =
  | "innovation" | "deployment" | "research" | "startups" | "investment" | "products"
  | "regulation" | "partnership" | "infrastructure";

/**
 * How an article relates to a country.
 * - `event`: the AI development happens in / concerns this country (what the map shows)
 * - `mentioned`: the country is referenced but is not the locus of the development
 * The publisher's own country is NOT stored here — see `Source.country`.
 */
export type CountryRole = "event" | "mentioned";

export interface ArticleCountry {
  code: string;
  role: CountryRole;
  /** 0..1 confidence from the classifier */
  confidence: number;
}

export interface Source {
  id: string;
  name: string;
  /** Homepage of the publisher */
  url: string;
  /** Country where the publisher is based (ISO alpha-2), never used as event location */
  country: string | null;
  kind: "rss" | "gdelt" | "eventregistry" | "newsapi" | "official" | "demo";
  /** 0..1 editorial reliability prior */
  reliability: number;
}

export type ProcessingStatus = "raw" | "classified" | "summarized" | "rejected";

export interface ClassificationTrace {
  /** Human-readable explanation of why each label was assigned */
  geo: string[];
  industries: string[];
  type: string[];
  method: "rules" | "llm" | "rules+llm" | "curated";
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  /** Concise factual summary (LLM-generated when configured, else extractive from the feed) */
  summary: string;
  summarySource: "llm" | "extractive" | "curated";
  url: string;
  canonicalUrl: string;
  imageUrl: string | null;
  language: string;
  publishedAt: string; // ISO
  ingestedAt: string; // ISO
  source: Source;
  countries: ArticleCountry[];
  industries: IndustrySlug[];
  contentType: ContentType;
  topics: string[];
  organizations: string[];
  /** 0..1 heuristic content quality */
  quality: number;
  /** Number of near-duplicate reports merged into this story */
  coverage: number;
  status: ProcessingStatus;
  trace: ClassificationTrace;
  /** True for sample content shipped for demo mode. Never presented as real news. */
  isDemo: boolean;
}

export type TimeRange = "24h" | "7d" | "30d" | "all" | "custom";

export interface ArticleQuery {
  q?: string;
  countries?: string[];
  regions?: RegionSlug[];
  /** Only articles with no specific event country (global / multi-region stories) */
  globalOnly?: boolean;
  industries?: IndustrySlug[];
  types?: ContentType[];
  topics?: string[];
  organization?: string;
  range?: TimeRange;
  from?: string;
  to?: string;
  sort?: "latest" | "top";
  limit?: number;
  offset?: number;
  excludeIds?: string[];
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface CountryActivity {
  code: string;
  count: number;
  /** top industries by article count */
  industries: { slug: IndustrySlug; count: number }[];
  latestAt: string | null;
}

export interface PulseStats {
  articles24h: number;
  articles7d: number;
  activeCountries: number;
  sources: number;
  daily: { day: string; count: number }[];
  topIndustries: { slug: IndustrySlug; count: number }[];
  topTypes: { slug: ContentType; count: number }[];
  lastIngestAt: string | null;
}

export interface TrendingTopic {
  topic: string;
  count: number;
  /** growth vs. the previous window, e.g. 0.5 = +50% */
  delta: number;
}

export interface CountryProfile {
  code: string;
  total: number;
  industries: { slug: IndustrySlug; count: number }[];
  types: { slug: ContentType; count: number }[];
  organizations: { name: string; count: number }[];
  topics: { topic: string; count: number }[];
  daily: { day: string; count: number }[];
}

export interface IngestionJob {
  id: string;
  provider: string;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "success" | "partial" | "failed";
  fetched: number;
  inserted: number;
  duplicates: number;
  rejected: number;
  errors: string[];
}

export interface SearchResults {
  articles: Article[];
  countries: string[];
  organizations: { name: string; count: number }[];
  topics: { topic: string; count: number }[];
  industries: IndustrySlug[];
}
