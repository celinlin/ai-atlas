import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 120);
  try {
    return NextResponse.json(await repo().search(q, 20));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
