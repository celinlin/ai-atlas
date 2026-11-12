"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getState, setState, type AtlasState } from "@/lib/store/atlas-store";

/**
 * Mirrors device-local state to Supabase for a signed-in user (RLS restricts
 * every row to its owner). Strategy: on sign-in, union remote + local follows
 * and saves, then push. Saved articles only sync when the article exists in the
 * `articles` table (demo items stay local).
 * NOTE: requires a configured Supabase project; not exercised in CI.
 */
export async function syncWithSupabase(sb: SupabaseClient, userId: string) {
  const [{ data: follows }, { data: saved }, { data: prefs }] = await Promise.all([
    sb.from("followed_entities").select("entity_type, entity_id"),
    sb.from("saved_articles").select("article_id"),
    sb.from("user_preferences").select("locale").maybeSingle(),
  ]);
  void prefs;
  const local = getState();
  const pick = (t: string) => (follows ?? []).filter((f) => f.entity_type === t).map((f) => f.entity_id as string);
  const merged: AtlasState = {
    ...local,
    prefs: {
      ...local.prefs,
      countries: [...new Set([...local.prefs.countries, ...pick("country")])],
      industries: [...new Set([...local.prefs.industries, ...pick("industry")])] as AtlasState["prefs"]["industries"],
      topics: [...new Set([...local.prefs.topics, ...pick("topic")])],
    },
  };
  setState(() => merged);
  const rows = [
    ...merged.prefs.countries.map((id) => ({ user_id: userId, entity_type: "country", entity_id: id })),
    ...merged.prefs.industries.map((id) => ({ user_id: userId, entity_type: "industry", entity_id: id })),
    ...merged.prefs.topics.map((id) => ({ user_id: userId, entity_type: "topic", entity_id: id })),
  ];
  if (rows.length) await sb.from("followed_entities").upsert(rows, { ignoreDuplicates: true });
  const remoteSaved = new Set((saved ?? []).map((s) => s.article_id as string));
  const toPush = merged.saved.filter((s) => !s.isDemo && !remoteSaved.has(s.id)).map((s) => ({ user_id: userId, article_id: s.id }));
  if (toPush.length) await sb.from("saved_articles").upsert(toPush, { ignoreDuplicates: true });
}
