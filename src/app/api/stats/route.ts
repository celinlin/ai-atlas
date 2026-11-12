import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { parseQuery } from "@/lib/query";

/** Map activity for the given filters (same filters as /api/articles). */
export async function GET(req: NextRequest) {
  const q = parseQuery(req.nextUrl.searchParams);
  try {
    const activity = await repo().countryActivity({ range: q.range, from: q.from, to: q.to, industries: q.industries, types: q.types, topics: q.topics });
    return NextResponse.json({ activity });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
