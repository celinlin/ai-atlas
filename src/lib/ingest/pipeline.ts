import { classifyItem, isNearDuplicate, type LlmHook } from "@/lib/classify";
import { canonicalizeUrl } from "@/lib/classify/dedupe";
import type { Repository } from "@/lib/data/repository";
import type { Article, IngestionJob } from "@/lib/types";
import { gdeltProvider } from "./providers/gdelt";
import { eventRegistryProvider, newsApiProvider } from "./providers/keyed";
import { rssProvider } from "./providers/rss";
import type { NewsProvider } from "./providers/types";

export const PROVIDERS: NewsProvider[] = [rssProvider, gdeltProvider, eventRegistryProvider, newsApiProvider];

export interface IngestOptions {
  providers?: NewsProvider[];
  llm?: LlmHook;
  now?: Date;
  log?: (msg: string) => void;
}

/**
 * Fetch → classify → deduplicate → store, one job record per provider.
 * Duplicates: same canonical URL (skipped) or near-identical headline within
 * 72h (merged: the existing story's coverage count is incremented).
 */
export async function runIngestion(repo: Repository, opts: IngestOptions = {}): Promise<IngestionJob[]> {
  const log = opts.log ?? ((m: string) => console.log(`[ingest] ${m}`));
  const providers = (opts.providers ?? PROVIDERS).filter((p) => p.enabled().enabled);
  const jobs: IngestionJob[] = [];

  for (const provider of providers) {
    const job: IngestionJob = {
      id: `${provider.id}-${Date.now().toString(36)}`,
      provider: provider.id,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: "running",
      fetched: 0, inserted: 0, duplicates: 0, rejected: 0, errors: [],
    };
    await repo.saveJob(job);
    try {
      const { items, errors } = await provider.fetch();
      job.fetched = items.length;
      job.errors.push(...errors);

      // 1) exact duplicates by canonical URL (against DB and within the batch)
      const canon = items.map((i) => canonicalizeUrl(i.url));
      const existing = await repo.existingCanonicalUrls([...new Set(canon)]);
      const seen = new Set<string>();
      const fresh = items.filter((_, i) => {
        const c = canon[i];
        if (existing.has(c) || seen.has(c)) {
          job.duplicates++;
          return false;
        }
        seen.add(c);
        return true;
      });

      // 2) classify (bounded concurrency so an LLM provider isn't flooded)
      const classified: Article[] = [];
      const queue = [...fresh];
      const workers = Array.from({ length: opts.llm ? 4 : 16 }, async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
          const r = await classifyItem(item, { llm: opts.llm, now: opts.now });
          if (r.ok) classified.push(r.article);
          else job.rejected++;
        }
      });
      await Promise.all(workers);

      // 3) near-duplicate headlines (syndication / rewrites)
      const recent = await repo.recentTitles(72);
      const accepted: Article[] = [];
      for (const a of classified.sort((x, y) => y.quality - x.quality)) {
        const inBatch = accepted.find((r) => isNearDuplicate(r.title, a.title));
        if (inBatch) {
          job.duplicates++;
          inBatch.coverage++;
          continue;
        }
        const stored = recent.find((r) => isNearDuplicate(r.title, a.title));
        if (stored) {
          job.duplicates++;
          await repo.bumpCoverage(stored.id);
          continue;
        }
        accepted.push(a);
      }

      job.inserted = await repo.insertArticles(accepted);
      job.status = job.errors.length ? (job.inserted || job.fetched ? "partial" : "failed") : "success";
    } catch (e) {
      job.status = "failed";
      job.errors.push((e as Error).message);
    }
    job.finishedAt = new Date().toISOString();
    await repo.saveJob(job);
    log(`${provider.id}: ${job.status} — fetched ${job.fetched}, inserted ${job.inserted}, duplicates ${job.duplicates}, rejected ${job.rejected}${job.errors.length ? `, errors: ${job.errors.join(" | ")}` : ""}`);
    jobs.push(job);
  }
  return jobs;
}
