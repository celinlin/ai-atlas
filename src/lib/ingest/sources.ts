import type { Source } from "@/lib/types";

export interface FeedConfig {
  source: Source;
  feedUrl: string;
  language: string;
  /** Licensing/usage note shown in the admin console. */
  terms: string;
}

/**
 * Default RSS/Atom feeds. Only publicly published feeds are listed; we store
 * headline, publisher description, date and link, and always send readers to
 * the original publication. Review each publisher's terms before production use.
 * Override or extend with RSS_FEEDS (see .env.example).
 */
export const DEFAULT_FEEDS: FeedConfig[] = [
  feed("mit-news-ai", "MIT News — AI", "https://news.mit.edu", "US", 0.9, "https://news.mit.edu/rss/topic/artificial-intelligence2", "en", "Public RSS; link back to MIT News"),
  feed("google-ai-blog", "Google — AI", "https://blog.google", "US", 0.75, "https://blog.google/technology/ai/rss/", "en", "Official company newsroom feed"),
  feed("openai-news", "OpenAI News", "https://openai.com", "US", 0.75, "https://openai.com/news/rss.xml", "en", "Official company newsroom feed"),
  feed("deepmind-blog", "Google DeepMind Blog", "https://deepmind.google", "GB", 0.8, "https://deepmind.google/blog/rss.xml", "en", "Official research blog feed"),
  feed("huggingface-blog", "Hugging Face Blog", "https://huggingface.co", "US", 0.75, "https://huggingface.co/blog/feed.xml", "en", "Public blog feed"),
  feed("techcrunch-ai", "TechCrunch — AI", "https://techcrunch.com", "US", 0.75, "https://techcrunch.com/category/artificial-intelligence/feed/", "en", "Public RSS; headlines + excerpts only"),
  feed("mit-tech-review-ai", "MIT Technology Review — AI", "https://www.technologyreview.com", "US", 0.85, "https://www.technologyreview.com/topic/artificial-intelligence/feed", "en", "Public RSS; headlines + excerpts only"),
  feed("rest-of-world", "Rest of World", "https://restofworld.org", "US", 0.85, "https://restofworld.org/feed/latest/", "en", "Public RSS; global tech coverage"),
  feed("ai-news", "AI News", "https://www.artificialintelligence-news.com", "GB", 0.65, "https://www.artificialintelligence-news.com/feed/", "en", "Public RSS"),
  feed("ec-digital-strategy", "European Commission — Digital Strategy", "https://digital-strategy.ec.europa.eu", "BE", 0.9, "https://digital-strategy.ec.europa.eu/en/rss.xml", "en", "Official EU publication feed"),
  feed("arxiv-cs-ai", "arXiv cs.AI", "https://arxiv.org", "US", 0.7, "https://export.arxiv.org/rss/cs.AI", "en", "arXiv RSS; abstracts under arXiv terms"),
];

function feed(id: string, name: string, url: string, country: string, reliability: number, feedUrl: string, language: string, terms: string): FeedConfig {
  return { source: { id, name, url, country, kind: "rss", reliability }, feedUrl, language, terms };
}

/** RSS_FEEDS="https://example.com/feed.xml|Example News|FR|0.7;https://..." */
export function configuredFeeds(env = process.env): FeedConfig[] {
  const extra = (env.RSS_FEEDS ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [feedUrl, name, country, rel] = entry.split("|").map((s) => s?.trim());
      const host = (() => {
        try {
          return new URL(feedUrl).origin;
        } catch {
          return null;
        }
      })();
      if (!host) return null;
      const id = `rss-${host.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-")}`;
      return feed(id, name || host, host, country?.toUpperCase() || "", Number(rel) || 0.6, feedUrl, "en", "Configured via RSS_FEEDS");
    })
    .filter((f): f is FeedConfig => !!f)
    .map((f) => ({ ...f, source: { ...f.source, country: f.source.country || null } }));
  if (env.RSS_DEFAULT_FEEDS === "off") return extra;
  return [...DEFAULT_FEEDS, ...extra];
}
