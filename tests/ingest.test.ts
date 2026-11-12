import { readFileSync, rmSync } from "node:fs";
import { describe, expect, it, beforeAll } from "vitest";
import { parseFeed } from "@/lib/ingest/providers/rss";
import { mapGdelt } from "@/lib/ingest/providers/gdelt";
import { runIngestion } from "@/lib/ingest/pipeline";
import type { NewsProvider } from "@/lib/ingest/providers/types";
import type { FeedConfig } from "@/lib/ingest/sources";

const STORE = "/tmp/atlas-test-store.json";
process.env.LOCAL_STORE_PATH = STORE;

const cfg = (id: string): FeedConfig => ({ source: { id, name: id, url: "https://fixture.example", country: "GB", kind: "rss", reliability: 0.7 }, feedUrl: "x", language: "en", terms: "" });

describe("feed parsing", () => {
  it("parses RSS 2.0 and Atom", () => {
    const rss = parseFeed(readFileSync("tests/fixtures/feed.xml", "utf8"), cfg("rss"));
    expect(rss).toHaveLength(6);
    expect(rss[0].title).toMatch(/Kenyan hospitals/);
    expect(rss[0].description).toMatch(/Nairobi/);
    const atom = parseFeed(readFileSync("tests/fixtures/atom.xml", "utf8"), cfg("atom"));
    expect(atom[0].url).toBe("https://lab.example/seoul-model");
    expect(atom[0].publishedAt).toBe("2026-11-11T12:00:00Z");
  });
  it("maps GDELT publisher country to the source only", () => {
    const [item] = mapGdelt([{ url: "https://n.example/a", title: "AI in Ghana", seendate: "20261111T101500Z", domain: "n.example", language: "English", sourcecountry: "United Kingdom" }]);
    expect(item.source.country).toBe("GB");
    expect(item.publishedAt).toBe("2026-11-11T10:15:00Z");
  });
});

describe("ingestion pipeline (local store)", () => {
  beforeAll(() => rmSync(STORE, { force: true }));
  it("classifies, deduplicates and stores; second run inserts nothing", async () => {
    const { LocalRepository } = await import("@/lib/data/local-store");
    const repo = new LocalRepository();
    const provider: NewsProvider = {
      id: "fixture",
      label: "Fixture",
      enabled: () => ({ enabled: true, reason: "" }),
      fetch: async () => ({
        items: [...parseFeed(readFileSync("tests/fixtures/feed.xml", "utf8"), cfg("fixture-rss")), ...parseFeed(readFileSync("tests/fixtures/atom.xml", "utf8"), cfg("fixture-atom"))],
        errors: [],
      }),
    };
    const now = new Date("2026-11-12T12:00:00Z");
    const [job] = await runIngestion(repo, { providers: [provider], now, log: () => {} });
    expect(job.status).toBe("success");
    expect(job.fetched).toBe(7);
    expect(job.inserted).toBe(3); // Kenya, Paris, Seoul
    expect(job.duplicates).toBe(2); // tracking-param URL + near-duplicate rewrite
    expect(job.rejected).toBe(2); // croissant (not AI) + undated

    const status = await repo.status();
    expect(status.demo).toBe(false);
    const kenya = await repo.listArticles({ countries: ["KE"] });
    expect(kenya.total).toBe(1);
    expect(kenya.items[0].coverage).toBe(2);
    expect(kenya.items[0].industries).toContain("healthcare");
    expect(kenya.items[0].url).toContain("fixture.example");
    const fr = await repo.listArticles({ countries: ["FR"], types: ["investment"] });
    expect(fr.total).toBe(1);
    const kr = await repo.listArticles({ countries: ["KR"] });
    expect(kr.items[0].contentType).toBe("research");

    const [job2] = await runIngestion(repo, { providers: [provider], now, log: () => {} });
    expect(job2.inserted).toBe(0);
    expect((await repo.listJobs()).length).toBe(2);
  });
});
