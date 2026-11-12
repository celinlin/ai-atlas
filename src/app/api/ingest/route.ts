import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { ingestNow } from "@/lib/ingest/run";

export const maxDuration = 300;

/** Manual ingestion trigger (admin console). */
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req.headers.get("authorization")))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await ingestNow());
}
