import { matchArticle, sortArticles } from "@/lib/query";
import type { Article, ArticleQuery } from "@/lib/types";
import * as agg from "./aggregate";
import type { StatsFilter } from "./repository";

/** Read-side repository methods over an in-memory article list. */
export abstract class MemoryView {
  protected abstract articles(): Article[];
  protected lastIngest(): string | null {
    return null;
  }

  async listArticles(q: ArticleQuery) {
    const now = new Date();
    const all = sortArticles(this.articles().filter((a) => matchArticle(a, q, now)), q.sort, now);
    const offset = q.offset ?? 0;
    return { items: all.slice(offset, offset + (q.limit ?? 20)), total: all.length };
  }
  async getArticle(slugOrId: string) {
    return this.articles().find((a) => a.slug === slugOrId || a.id === slugOrId) ?? null;
  }
  async getArticlesByIds(ids: string[]) {
    const set = new Set(ids);
    return this.articles().filter((a) => set.has(a.id));
  }
  async related(article: Article, limit?: number) {
    return agg.related(this.articles(), article, limit);
  }
  async countryActivity(f?: StatsFilter) {
    return agg.countryActivity(this.articles(), f);
  }
  async countryProfile(code: string, f?: StatsFilter) {
    return agg.countryProfile(this.articles(), code, f);
  }
  async industryStats(f?: StatsFilter) {
    return agg.industryStats(this.articles(), f);
  }
  async pulse() {
    return agg.pulse(this.articles(), new Date(), this.lastIngest());
  }
  async trendingTopics(limit?: number) {
    return agg.trending(this.articles(), limit);
  }
  async search(q: string, limit?: number) {
    return agg.search(this.articles(), q, limit);
  }
}

export class StaticView extends MemoryView {
  constructor(private readonly list: () => Article[]) {
    super();
  }
  protected articles() {
    return this.list();
  }
}
