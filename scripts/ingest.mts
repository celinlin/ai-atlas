/**
 * CLI ingestion.
 *   npm run ingest            # one run
 *   npm run ingest -- --watch # run every INGEST_INTERVAL_MINUTES (default 20)
 */
import { ingestNow } from "@/lib/ingest/run";

const watch = process.argv.includes("--watch");
const minutes = Math.max(5, Number(process.env.INGEST_INTERVAL_MINUTES) || 20);

async function once() {
  const started = Date.now();
  const res = await ingestNow();
  if (res.skipped) console.log(`[ingest] skipped: ${res.reason}`);
  console.log(`[ingest] finished in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

await once();
if (watch) {
  console.log(`[ingest] watching — next run every ${minutes} min`);
  setInterval(() => void once().catch((e) => console.error("[ingest] run failed", e)), minutes * 60_000);
} else {
  process.exit(0);
}
