import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { parseQuery } from "@/lib/query";

export async function GET(req: NextRequest) {
  try {
    const q = parseQuery(req.nextUrl.searchParams);
    const ids = req.nextUrl.searchParams.get("ids");
    if (ids) return NextResponse.json({ items: await repo().getArticlesByIds(ids.split(",").slice(0, 100)) });
    return NextResponse.json(await repo().listArticles(q), { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load articles" }, { status: 500 });
  }
}
