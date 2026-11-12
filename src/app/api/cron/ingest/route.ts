import { NextResponse, type NextRequest } from "next/server";
import { ingestNow } from "@/lib/ingest/run";

export const maxDuration = 300;

/** Scheduled ingestion (Vercel Cron, GitHub Actions, any scheduler). Requires CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await ingestNow());
}
