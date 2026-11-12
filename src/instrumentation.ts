/**
 * Optional in-process scheduler for long-running Node deployments
 * (`next start`, Docker). Enable with INGEST_SCHEDULER=on. On serverless hosts
 * use the cron endpoint (/api/cron/ingest) instead — see README.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.INGEST_SCHEDULER !== "on") return;
  const g = globalThis as unknown as { __atlasScheduler?: boolean };
  if (g.__atlasScheduler) return;
  g.__atlasScheduler = true;
  const minutes = Math.max(5, Number(process.env.INGEST_INTERVAL_MINUTES) || 20);
  const { ingestNow } = await import("@/lib/ingest/run");
  const tick = () => ingestNow().catch((e) => console.error("[scheduler] ingestion failed", e));
  setTimeout(tick, 15_000);
  setInterval(tick, minutes * 60_000);
  console.log(`[scheduler] ingestion every ${minutes} min`);
}
