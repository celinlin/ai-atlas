import "server-only";
import { repo } from "@/lib/data";
import { enrichWithLlm, llmEnabled } from "@/lib/classify/llm";
import { runIngestion } from "./pipeline";

let running: Promise<unknown> | null = null;

/** Single-flight ingestion entry point used by the API, cron and scheduler. */
export async function ingestNow() {
  if (running) return { skipped: true as const, reason: "An ingestion run is already in progress" };
  running = runIngestion(repo(), { llm: llmEnabled() ? enrichWithLlm : undefined });
  try {
    return { skipped: false as const, jobs: await running };
  } finally {
    running = null;
  }
}
