"use client";
import { useSyncExternalStore } from "react";
import { EMPTY_EXPLORER, type ExplorerState, type ReadRecord } from "@/lib/passport";
import type { Article, IndustrySlug } from "@/lib/types";

/**
 * Device-local user state. Public exploration never requires an account; when
 * Supabase auth is configured and the user signs in, `supabase/sync.ts`
 * mirrors this state to the database.
 */

export interface SavedItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  countries: string[];
  industries: IndustrySlug[];
  contentType: Article["contentType"];
  isDemo: boolean;
  savedAt: string;
}

export interface AtlasState {
  version: 1;
  prefs: { countries: string[]; industries: IndustrySlug[]; topics: string[]; onboarded: boolean };
  saved: SavedItem[];
  explorer: ExplorerState;
  updatedAt: string;
}

const KEY = "ai-atlas:v1";
const EMPTY: AtlasState = {
  version: 1,
  prefs: { countries: [], industries: [], topics: [], onboarded: false },
  saved: [],
  explorer: EMPTY_EXPLORER,
  updatedAt: new Date(0).toISOString(),
};

let state: AtlasState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as AtlasState) };
  } catch {
    /* storage unavailable (private mode) — keep in-memory state */
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      state = JSON.parse(e.newValue);
      listeners.forEach((l) => l());
    } catch {}
  });
}

export function getState(): AtlasState {
  hydrate();
  return state;
}

export function setState(updater: (s: AtlasState) => AtlasState) {
  hydrate();
  state = { ...updater(state), updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  hydrate();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAtlas<T>(selector: (s: AtlasState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()), () => selector(EMPTY));
}

/** True after the client store has loaded (avoid hydration flashes). */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

// ---------- actions ----------
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export const actions = {
  toggleFollowCountry: (code: string) => setState((s) => ({ ...s, prefs: { ...s.prefs, countries: toggle(s.prefs.countries, code) } })),
  toggleFollowIndustry: (slug: IndustrySlug) => setState((s) => ({ ...s, prefs: { ...s.prefs, industries: toggle(s.prefs.industries, slug) } })),
  toggleFollowTopic: (slug: string) => setState((s) => ({ ...s, prefs: { ...s.prefs, topics: toggle(s.prefs.topics, slug) } })),
  setOnboarded: () => setState((s) => ({ ...s, prefs: { ...s.prefs, onboarded: true } })),
  resetPrefs: () => setState((s) => ({ ...s, prefs: EMPTY.prefs })),
  resetPassport: () => setState((s) => ({ ...s, explorer: EMPTY_EXPLORER })),
  toggleSave: (a: Article) =>
    setState((s) =>
      s.saved.some((x) => x.id === a.id)
        ? { ...s, saved: s.saved.filter((x) => x.id !== a.id) }
        : {
            ...s,
            saved: [
              {
                id: a.id, slug: a.slug, title: a.title, summary: a.summary, url: a.url, sourceName: a.source.name, publishedAt: a.publishedAt,
                countries: a.countries.filter((c) => c.role === "event").map((c) => c.code), industries: a.industries, contentType: a.contentType,
                isDemo: a.isDemo, savedAt: new Date().toISOString(),
              },
              ...s.saved,
            ].slice(0, 500),
          },
    ),
  exploreCountry: (code: string) =>
    setState((s) => (s.explorer.countries[code] ? s : { ...s, explorer: { ...s.explorer, countries: { ...s.explorer.countries, [code]: new Date().toISOString() } } })),
  recordRead: (a: Pick<Article, "id" | "countries" | "industries" | "contentType">) =>
    setState((s) => {
      if (s.explorer.reads.some((r) => r.id === a.id)) return s;
      const rec: ReadRecord = { id: a.id, at: new Date().toISOString(), countries: a.countries.filter((c) => c.role === "event").map((c) => c.code), industries: a.industries, type: a.contentType };
      const industries = { ...s.explorer.industries };
      for (const i of a.industries) industries[i] ??= rec.at;
      const countries = { ...s.explorer.countries };
      for (const c of rec.countries) countries[c] ??= rec.at;
      return { ...s, explorer: { ...s.explorer, industries, countries, reads: [rec, ...s.explorer.reads].slice(0, 400) } };
    }),
  recordSourceOpened: () => setState((s) => ({ ...s, explorer: { ...s.explorer, sourcesOpened: s.explorer.sourcesOpened + 1 } })),
  replace: (next: AtlasState) => setState(() => next),
};
