import { describe, expect, it } from "vitest";
import { classifyGeography } from "@/lib/classify/geo";
import { classifyContentType, classifyIndustries, extractOrganizations, isAiRelated } from "@/lib/classify/rules";
import { canonicalizeUrl, isNearDuplicate } from "@/lib/classify/dedupe";
import { classifyItem } from "@/lib/classify";
import type { Source } from "@/lib/types";

const londonOutlet: Source = { id: "x", name: "London Daily", url: "https://x", country: "GB", kind: "rss", reliability: 0.7 };
const events = (t: string, b = "") => classifyGeography(t, b).countries.filter((c) => c.role === "event").map((c) => c.code);

describe("geographic classification", () => {
  it("locates the development, not the publisher", async () => {
    const r = await classifyItem({ title: "Nairobi startup launches AI tool for farmers", url: "https://x/a", description: "The Kenyan company uses machine learning.", publishedAt: "2026-11-10T00:00:00Z", source: londonOutlet }, { now: new Date("2026-11-12") });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.article.countries.find((c) => c.role === "event")?.code).toBe("KE");
      expect(r.article.countries.some((c) => c.code === "GB")).toBe(false);
      expect(r.article.source.country).toBe("GB");
    }
  });
  it("handles demonyms, cities and French names", () => {
    expect(events("Japanese automaker tests AI driving system")).toContain("JP");
    expect(events("Une start-up française lève 20 millions pour l'IA", "La société basée à Lyon")).toContain("FR");
    expect(events("Bengaluru hospitals adopt AI")).toContain("IN");
    expect(events("U.S. regulators open AI inquiry")).toContain("US");
  });
  it("avoids common false positives", () => {
    expect(events("Latin American banks adopt AI")).not.toContain("US");
    expect(events("Michael Jordan invests in AI sports startup")).not.toContain("JO");
    expect(events("Georgia Tech researchers build AI model", "in Atlanta")).not.toContain("GE");
    expect(events("New Mexico lab trains AI")).not.toContain("MX");
  });
  it("returns no country for global stories", () => {
    expect(events("Researchers propose new benchmark for language models")).toEqual([]);
  });
  it("separates event from mentioned countries", () => {
    const r = classifyGeography("Brazil deploys AI in public schools", "The program was inspired by a pilot once run in Chile.");
    expect(r.countries.find((c) => c.code === "BR")?.role).toBe("event");
    expect(r.countries.find((c) => c.code === "CL")?.role).toBe("mentioned");
  });
});

describe("topical classification", () => {
  it("detects industries and type", () => {
    expect(classifyIndustries("Hospital deploys AI for radiology diagnosis", "").industries).toContain("healthcare");
    expect(classifyIndustries("New foundation model released", "").industries).toEqual(["general"]);
    expect(classifyContentType("Startup raises $30 million Series A for AI chips", "").type).toBe("investment");
    expect(classifyContentType("EU lawmakers agree rules to regulate AI", "").type).toBe("regulation");
    expect(classifyContentType("Researchers publish study on LLM reasoning", "").type).toBe("research");
  });
  it("filters non-AI content", () => {
    expect(isAiRelated("Best croissant in town", "A bakery won.")).toBe(false);
    expect(isAiRelated("New AI model", "")).toBe(true);
    expect(isAiRelated("Paid mail trends", "")).toBe(false);
  });
  it("extracts organizations", () => {
    const orgs = extractOrganizations("Google DeepMind and Kestrel Robotics partner on AI", "Nvidia chips will power the project.");
    expect(orgs).toEqual(expect.arrayContaining(["Google DeepMind", "Kestrel Robotics", "Nvidia"]));
    expect(orgs).not.toContain("Google");
  });
});

describe("deduplication", () => {
  it("canonicalizes URLs", () => {
    expect(canonicalizeUrl("http://www.Example.com/a/?utm_source=x&b=2#top")).toBe("https://example.com/a?b=2");
    expect(canonicalizeUrl("https://example.com/a/amp/")).toBe("https://example.com/a");
  });
  it("detects near-duplicate headlines", () => {
    expect(isNearDuplicate("Kenyan hospitals deploy AI triage tool to cut emergency waiting times", "Kenyan hospitals deploy AI triage tool to cut ER waiting times")).toBe(true);
    expect(isNearDuplicate("Kenyan hospitals deploy AI triage tool", "Paris startup raises Series B for AI agents")).toBe(false);
  });
  it("rejects items without a real publication date", async () => {
    const r = await classifyItem({ title: "AI news", url: "https://x/y", description: "machine learning", publishedAt: null, source: londonOutlet });
    expect(r.ok).toBe(false);
  });
});
