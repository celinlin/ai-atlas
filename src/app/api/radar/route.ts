import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { repo } from "@/lib/data";
import { recommend } from "@/lib/recommend/score";
import { isIndustry } from "@/lib/taxonomy";
import type { IndustrySlug } from "@/lib/types";

const Body = z.object({
  countries: z.array(z.string().length(2)).max(100).default([]),
  industries: z.array(z.string()).max(30).default([]),
  topics: z.array(z.string()).max(50).default([]),
  savedIds: z.array(z.string()).max(500).default([]),
  history: z.array(z.object({ countries: z.array(z.string()), industries: z.array(z.string()), topics: z.array(z.string()).default([]) })).max(50).default([]),
  limit: z.number().int().min(1).max(60).default(30),
});

/** Explainable personalized ranking over the last 30 days of stories. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const b = parsed.data;
  try {
    const { items } = await repo().listArticles({ range: "30d", sort: "latest", limit: 400 });
    const results = recommend(
      items,
      { countries: b.countries.map((c) => c.toUpperCase()), industries: b.industries.filter(isIndustry) as IndustrySlug[], topics: b.topics },
      { savedIds: b.savedIds, history: b.history.map((h) => ({ ...h, industries: h.industries.filter(isIndustry) as IndustrySlug[] })) },
      b.limit,
    );
    return NextResponse.json({ items: results.map((r) => ({ article: r.article, score: Math.round(r.score * 100) / 100, reasons: r.reasons, breakdown: r.breakdown })) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to build radar" }, { status: 500 });
  }
}
