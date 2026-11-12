import { countryByCode } from "@/lib/geo/countries";
import type { Article, ArticleQuery, ContentType, IndustrySlug, RegionSlug, TimeRange } from "@/lib/types";
import { isContentType, isIndustry, isRegion } from "@/lib/taxonomy";

export const RANGE_HOURS: Record<Exclude<TimeRange, "custom" | "all">, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

export function rangeBounds(q: Pick<ArticleQuery, "range" | "from" | "to">, now = new Date()): { from: Date | null; to: Date | null } {
  if (q.range === "custom") {
    const from = q.from ? new Date(q.from) : null;
    // Inclusive end-of-day for date-only inputs.
    const to = q.to ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(q.to) ? `${q.to}T23:59:59.999Z` : q.to) : null;
    return { from: from && !isNaN(+from) ? from : null, to: to && !isNaN(+to) ? to : null };
  }
  if (!q.range || q.range === "all") return { from: null, to: null };
  return { from: new Date(now.getTime() - RANGE_HOURS[q.range] * 3600_000), to: null };
}

export function eventCountries(a: Article): string[] {
  return a.countries.filter((c) => c.role === "event").map((c) => c.code);
}

/** In-memory predicate mirroring the SQL filters of the Postgres repository. */
export function matchArticle(a: Article, q: ArticleQuery, now = new Date()): boolean {
  const { from, to } = rangeBounds(q, now);
  const t = new Date(a.publishedAt).getTime();
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  const ev = eventCountries(a);
  if (q.countries?.length && !ev.some((c) => q.countries!.includes(c))) return false;
  if (q.regions?.length && !ev.some((c) => q.regions!.includes(countryByCode.get(c)?.region as RegionSlug))) return false;
  if (q.globalOnly && ev.length) return false;
  if (q.industries?.length && !a.industries.some((i) => q.industries!.includes(i))) return false;
  if (q.types?.length && !q.types.includes(a.contentType)) return false;
  if (q.topics?.length && !a.topics.some((t2) => q.topics!.includes(t2))) return false;
  if (q.organization && !a.organizations.some((o) => o.toLowerCase() === q.organization!.toLowerCase())) return false;
  if (q.excludeIds?.includes(a.id)) return false;
  if (q.q) {
    const hay = `${a.title} ${a.summary} ${a.organizations.join(" ")} ${a.source.name} ${ev.map((c) => countryByCode.get(c)?.en ?? "").join(" ")}`.toLowerCase();
    const terms = q.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.every((term) => hay.includes(term))) return false;
  }
  return true;
}

/** Editorial ranking: quality, freshness (36h half-life), coverage, source reliability. */
export function storyScore(a: Article, now = new Date()): number {
  const ageH = Math.max(0, (now.getTime() - new Date(a.publishedAt).getTime()) / 3600_000);
  const freshness = Math.pow(0.5, ageH / 36);
  const coverage = Math.min(1, Math.log2(1 + a.coverage) / 3);
  return 0.35 * a.quality + 0.35 * freshness + 0.15 * coverage + 0.15 * a.source.reliability;
}

export function sortArticles(items: Article[], sort: ArticleQuery["sort"] = "latest", now = new Date()): Article[] {
  if (sort === "top") return [...items].sort((x, y) => storyScore(y, now) - storyScore(x, now));
  return [...items].sort((x, y) => y.publishedAt.localeCompare(x.publishedAt));
}

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v.join(",") : v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Parse URL search params into a validated ArticleQuery (unknown values are dropped). */
export function parseQuery(sp: Record<string, string | string[] | undefined> | URLSearchParams): ArticleQuery {
  const get = (k: string) => (sp instanceof URLSearchParams ? sp.getAll(k) : sp[k]) as string | string[] | undefined;
  const one = (k: string) => {
    const v = get(k);
    return (Array.isArray(v) ? v[0] : v) || undefined;
  };
  const range = one("range");
  const sort = one("sort");
  const q: ArticleQuery = {
    q: one("q")?.slice(0, 120),
    countries: list(get("country")).map((c) => c.toUpperCase()).filter((c) => countryByCode.has(c)),
    regions: list(get("region")).filter(isRegion) as RegionSlug[],
    industries: list(get("industry")).filter(isIndustry) as IndustrySlug[],
    types: list(get("type")).filter(isContentType) as ContentType[],
    topics: list(get("topic")),
    organization: one("org"),
    globalOnly: one("scope") === "global",
    range: (["24h", "7d", "30d", "all", "custom"] as const).find((r) => r === range),
    from: one("from"),
    to: one("to"),
    sort: sort === "top" ? "top" : "latest",
    limit: Math.min(60, Math.max(1, Number(one("limit")) || 20)),
    offset: Math.max(0, Number(one("offset")) || 0),
  };
  return q;
}

export function queryToSearchParams(q: ArticleQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  if (q.countries?.length) sp.set("country", q.countries.join(","));
  if (q.regions?.length) sp.set("region", q.regions.join(","));
  if (q.industries?.length) sp.set("industry", q.industries.join(","));
  if (q.types?.length) sp.set("type", q.types.join(","));
  if (q.topics?.length) sp.set("topic", q.topics.join(","));
  if (q.organization) sp.set("org", q.organization);
  if (q.globalOnly) sp.set("scope", "global");
  if (q.range) sp.set("range", q.range);
  if (q.from) sp.set("from", q.from);
  if (q.to) sp.set("to", q.to);
  if (q.sort && q.sort !== "latest") sp.set("sort", q.sort);
  return sp;
}
