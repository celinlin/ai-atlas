import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { isCountryCode } from "@/lib/geo/countries";
import { parseQuery } from "@/lib/query";

/** Country intelligence panel: profile + latest articles, honoring industry/date filters. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params;
  const code = raw.toUpperCase();
  if (!isCountryCode(code)) return NextResponse.json({ error: "Unknown country" }, { status: 404 });
  const q = parseQuery(req.nextUrl.searchParams);
  const f = { range: q.range, from: q.from, to: q.to, industries: q.industries, types: q.types };
  try {
    const [profile, articles] = await Promise.all([
      repo().countryProfile(code, f),
      repo().listArticles({ ...f, countries: [code], sort: "latest", limit: q.limit ?? 12, offset: q.offset }),
    ]);
    return NextResponse.json({ profile, articles });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load country" }, { status: 500 });
  }
}
