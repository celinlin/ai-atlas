import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "atlas-admin";
const digest = (s: string) => createHash("sha256").update(`ai-atlas:${s}`).digest("hex");

/** Admin is protected by ADMIN_TOKEN. Without it, admin is open only in development. */
export function adminMode(): "token" | "dev-open" | "locked" {
  if (process.env.ADMIN_TOKEN) return "token";
  return process.env.NODE_ENV === "production" ? "locked" : "dev-open";
}

export function tokenMatches(candidate: string | null | undefined): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token || !candidate) return false;
  const a = Buffer.from(digest(candidate));
  const b = Buffer.from(digest(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdmin(authHeader?: string | null): Promise<boolean> {
  const mode = adminMode();
  if (mode === "dev-open") return true;
  if (mode === "locked") return false;
  if (authHeader?.startsWith("Bearer ") && tokenMatches(authHeader.slice(7))) return true;
  const c = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!c && c === digest(process.env.ADMIN_TOKEN!);
}

export function sessionValue(): string {
  return digest(process.env.ADMIN_TOKEN!);
}
