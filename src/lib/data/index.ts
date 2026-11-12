import "server-only";
import { LocalRepository } from "./local-store";
import { PgRepository } from "./pg-store";
import type { Repository } from "./repository";

const g = globalThis as unknown as { __atlasRepo?: Repository };

/** Postgres when DATABASE_URL is set, otherwise the zero-config local JSON store. */
export function repo(): Repository {
  if (!g.__atlasRepo) g.__atlasRepo = process.env.DATABASE_URL ? new PgRepository(process.env.DATABASE_URL) : new LocalRepository();
  return g.__atlasRepo;
}
export type { Repository } from "./repository";
