import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { parseFeed } from "@/lib/ingest/providers/rss";
import { runIngestion } from "@/lib/ingest/pipeline";
import type { NewsProvider } from "@/lib/ingest/providers/types";

/** Runs only with TEST_DATABASE_URL pointing at a migrated, disposable database. */
const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("Postgres repository", async () => {
  const { PgRepository } = await import("@/lib/data/pg-store");
  const repo = new PgRepository(url!);
  afterAll(() => repo.end());

  const cfg = (id: string) => ({ source: { id, name: id, url: "https://fixture.example", country: "GB", kind: "rss" as const, reliability: 0.7 }, feedUrl: "x", language: "en", terms: "" });
  // Fixture dates are pinned to Nov 2026; shift them close to "now" so time-range queries see them.
  const shift = (xml: string) => xml.replace(/(Wed|Tue), 1[01] Nov 2026 [0-9:]+ GMT/g, new Date(Date.now() - 3 * 3600_000).toUTCString()).replace(/2026-11-11T12:00:00Z/, new Date(Date.now() - 5 * 3600_000).toISOString());
  const provider: NewsProvider = {
    id: "fixture-pg",
    label: "Fixture",
    enabled: () => ({ enabled: true, reason: "" }),
    fetch: async () => ({
      items: [...parseFeed(shift(readFileSync("tests/fixtures/feed.xml", "utf8")), cfg("fx-rss")), ...parseFeed(shift(readFileSync("tests/fixtures/atom.xml", "utf8")), cfg("fx-atom"))],
      errors: [],
    }),
  };

  it("ingests, dedupes and serves structured queries", async () => {
    const [job] = await runIngestion(repo, { providers: [provider], log: () => {} });
    expect(job.status).toBe("success");
    expect(job.inserted + job.duplicates + job.rejected).toBe(job.fetched);

    const status = await repo.status();
    expect(status.backend).toBe("postgres");
    expect(status.demo).toBe(false);

    const ke = await repo.listArticles({ countries: ["KE"], range: "7d" });
    expect(ke.total).toBe(1);
    expect(ke.items[0].countries.find((c) => c.role === "event")?.code).toBe("KE");
    expect(ke.items[0].source.country).toBe("GB");
    expect(ke.items[0].coverage).toBeGreaterThanOrEqual(2);

    expect((await repo.listArticles({ regions: ["europe"], types: ["investment"] })).total).toBe(1);
    expect((await repo.listArticles({ industries: ["healthcare"], countries: ["FR"] })).total).toBe(0);
    expect((await repo.listArticles({ q: "triage" })).total).toBe(1);
    expect((await repo.listArticles({ sort: "top", limit: 2 })).items.length).toBe(2);

    const act = await repo.countryActivity({ range: "30d" });
    expect(act.map((a) => a.code).sort()).toEqual(expect.arrayContaining(["KE", "FR", "KR"]));
    const prof = await repo.countryProfile("KE", { range: "30d" });
    expect(prof.total).toBe(1);
    expect(prof.daily).toHaveLength(30);
    const pulse = await repo.pulse();
    expect(pulse.articles24h).toBeGreaterThanOrEqual(3);
    expect((await repo.industryStats()).find((i) => i.slug === "healthcare")!.count).toBeGreaterThanOrEqual(1);
    const s = await repo.search("Kenya");
    expect(s.countries).toContain("KE");
    expect(s.articles.length).toBeGreaterThanOrEqual(1);
    const art = await repo.getArticle(ke.items[0].slug);
    expect(art?.id).toBe(ke.items[0].id);
    expect(Array.isArray(await repo.related(art!))).toBe(true);
    expect((await repo.listJobs()).some((j) => j.id === job.id)).toBe(true);

    const [again] = await runIngestion(repo, { providers: [provider], log: () => {} });
    expect(again.inserted).toBe(0);
  });
});
