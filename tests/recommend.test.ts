import { describe, expect, it } from "vitest";
import { buildDemoArticles } from "@/data/demo";
import { recommend } from "@/lib/recommend/score";
import { achievementStatus, EMPTY_EXPLORER, isoWeek, weeklyChallenge } from "@/lib/passport";
import { matchArticle } from "@/lib/query";
import { countryActivity } from "@/lib/data/aggregate";

const now = new Date("2026-11-12T12:00:00Z");
const articles = buildDemoArticles(now);

describe("filters", () => {
  it("filters by country, region, industry, type and range", () => {
    const ke = articles.filter((a) => matchArticle(a, { countries: ["KE"] }, now));
    expect(ke.every((a) => a.countries.some((c) => c.code === "KE" && c.role === "event"))).toBe(true);
    const africa = articles.filter((a) => matchArticle(a, { regions: ["africa"] }, now));
    expect(africa.length).toBeGreaterThan(3);
    const day = articles.filter((a) => matchArticle(a, { range: "24h" }, now));
    expect(day.every((a) => now.getTime() - new Date(a.publishedAt).getTime() <= 24 * 3600_000)).toBe(true);
    const combo = articles.filter((a) => matchArticle(a, { industries: ["healthcare"], types: ["deployment"] }, now));
    expect(combo.every((a) => a.industries.includes("healthcare") && a.contentType === "deployment")).toBe(true);
    // "mentioned" countries do not count as event location
    expect(articles.filter((a) => matchArticle(a, { countries: ["BR"] }, now)).some((a) => a.title.includes("Portuguese-language"))).toBe(false);
  });
  it("aggregates activity by event country", () => {
    const act = countryActivity(articles, {}, now);
    expect(act.find((c) => c.code === "US")!.count).toBeGreaterThanOrEqual(2);
  });
});

describe("recommendations", () => {
  it("prioritises followed entities and explains why", () => {
    const res = recommend(articles, { countries: ["JP"], industries: ["healthcare"], topics: [] }, { savedIds: [], history: [] }, 10, now);
    expect(res[0].reasons.some((r) => r.kind === "country" || r.kind === "industry")).toBe(true);
    const top5 = res.slice(0, 5);
    expect(top5.some((s) => s.article.countries.some((c) => c.code === "JP"))).toBe(true);
    // diversity: not all from the same country
    expect(new Set(res.map((s) => s.article.countries[0]?.code)).size).toBeGreaterThan(3);
  });
  it("excludes saved articles", () => {
    const res = recommend(articles, { countries: [], industries: [], topics: [] }, { savedIds: [articles[0].id], history: [] }, 50, now);
    expect(res.some((s) => s.article.id === articles[0].id)).toBe(false);
  });
});

describe("passport", () => {
  it("tracks achievements and weekly challenges", () => {
    const s = { ...EMPTY_EXPLORER, countries: { KE: now.toISOString(), NG: now.toISOString() }, reads: [{ id: "a", at: now.toISOString(), countries: ["KE"], industries: ["healthcare" as const], type: "research" as const }] };
    const st = achievementStatus(s);
    expect(st.find((a) => a.slug === "first-stamp")!.unlocked).toBe(true);
    expect(st.find((a) => a.slug === "emerging-markets")!.current).toBe(2);
    expect(isoWeek(new Date("2026-01-01")).key).toBe("2026-W01");
    const ch = weeklyChallenge(s, now);
    expect(ch.target).toBeGreaterThan(0);
  });
});
