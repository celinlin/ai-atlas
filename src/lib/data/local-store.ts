import "server-only";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildDemoArticles } from "@/data/demo";
import { sortArticles } from "@/lib/query";
import type { Article, IngestionJob } from "@/lib/types";
import { MemoryView } from "./memory-view";
import type { DataStatus, Repository } from "./repository";

/**
 * Zero-configuration file-backed repository (`.data/atlas.json`).
 * Used when DATABASE_URL is not set — ideal for local development and demos.
 * The ingestion CLI writes the same file; the server reloads it on change.
 */

interface FileShape {
  articles: Article[];
  jobs: IngestionJob[];
}

// Built at runtime so the bundler doesn't trace the whole project for this path.
const FILE = resolve(/* turbopackIgnore: true */ process.cwd(), process.env.LOCAL_STORE_PATH || [".data", "atlas.json"].join("/"));
const MAX_ARTICLES = 5000;

export class LocalRepository extends MemoryView implements Repository {
  readonly backend = "local" as const;
  private data: FileShape = { articles: [], jobs: [] };
  private mtime = -1;

  private load(): FileShape {
    try {
      if (existsSync(FILE)) {
        const m = statSync(FILE).mtimeMs;
        if (m !== this.mtime) {
          this.data = JSON.parse(readFileSync(FILE, "utf8")) as FileShape;
          this.mtime = m;
        }
      }
    } catch (e) {
      console.error("[local-store] failed to read store", e);
    }
    return this.data;
  }

  private persist() {
    mkdirSync(dirname(FILE), { recursive: true });
    const tmp = `${FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data));
    renameSync(tmp, FILE);
    this.mtime = statSync(FILE).mtimeMs;
  }

  /** Real articles, or the labelled demo set when nothing real is ingested (or DEMO_MODE=on). */
  protected articles(): Article[] {
    const real = this.load().articles;
    const mode = process.env.DEMO_MODE ?? "auto";
    if (mode === "off") return real;
    if (mode === "on" || real.length === 0) return [...real, ...buildDemoArticles()];
    return real;
  }

  protected lastIngest() {
    return this.load().jobs.find((j) => j.finishedAt)?.finishedAt ?? null;
  }

  async status(): Promise<DataStatus> {
    const real = this.load().articles.length;
    const jobs = this.data.jobs;
    const mode = process.env.DEMO_MODE ?? "auto";
    return {
      backend: "local",
      demo: mode === "on" || (mode !== "off" && real === 0),
      realArticles: real,
      lastIngestAt: jobs.find((j) => j.finishedAt)?.finishedAt ?? null,
    };
  }

  async existingCanonicalUrls(urls: string[]) {
    const set = new Set(urls);
    return new Set(this.load().articles.filter((a) => set.has(a.canonicalUrl)).map((a) => a.canonicalUrl));
  }
  async recentTitles(hours: number) {
    const since = Date.now() - hours * 3600_000;
    return this.load().articles.filter((a) => new Date(a.publishedAt).getTime() >= since).map((a) => ({ id: a.id, title: a.title }));
  }
  async insertArticles(articles: Article[]) {
    const d = this.load();
    const ids = new Set(d.articles.map((a) => a.id));
    const fresh = articles.filter((a) => !ids.has(a.id));
    d.articles = sortArticles([...fresh, ...d.articles], "latest").slice(0, MAX_ARTICLES);
    this.persist();
    return fresh.length;
  }
  async bumpCoverage(id: string) {
    const a = this.load().articles.find((x) => x.id === id);
    if (a) {
      a.coverage += 1;
      this.persist();
    }
  }
  async saveJob(job: IngestionJob) {
    const d = this.load();
    d.jobs = [job, ...d.jobs.filter((j) => j.id !== job.id)].slice(0, 200);
    this.persist();
  }
  async listJobs(limit = 30) {
    return this.load().jobs.slice(0, limit);
  }
}
