import type {
  Article, ArticleQuery, CountryActivity, CountryProfile, IndustrySlug, IngestionJob, Page, PulseStats, SearchResults, TrendingTopic,
} from "@/lib/types";

export type StatsFilter = Pick<ArticleQuery, "range" | "from" | "to" | "industries" | "types" | "topics">;

export interface DataStatus {
  backend: "postgres" | "local";
  /** True when only sample content is being served */
  demo: boolean;
  realArticles: number;
  lastIngestAt: string | null;
}

export interface Repository {
  readonly backend: "postgres" | "local";
  status(): Promise<DataStatus>;

  listArticles(q: ArticleQuery): Promise<Page<Article>>;
  getArticle(slugOrId: string): Promise<Article | null>;
  getArticlesByIds(ids: string[]): Promise<Article[]>;
  related(article: Article, limit?: number): Promise<Article[]>;

  countryActivity(f?: StatsFilter): Promise<CountryActivity[]>;
  countryProfile(code: string, f?: StatsFilter): Promise<CountryProfile>;
  industryStats(f?: StatsFilter): Promise<{ slug: IndustrySlug; count: number; countries: number; daily: number[] }[]>;
  pulse(): Promise<PulseStats>;
  trendingTopics(limit?: number): Promise<TrendingTopic[]>;
  search(q: string, limit?: number): Promise<SearchResults>;

  // Ingestion
  existingCanonicalUrls(urls: string[]): Promise<Set<string>>;
  recentTitles(hours: number): Promise<{ id: string; title: string }[]>;
  insertArticles(articles: Article[]): Promise<number>;
  bumpCoverage(id: string): Promise<void>;
  saveJob(job: IngestionJob): Promise<void>;
  listJobs(limit?: number): Promise<IngestionJob[]>;
}
