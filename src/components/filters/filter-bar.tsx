"use client";
import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CountrySearch } from "@/components/map/country-search";
import { Chip } from "@/components/ui/chip";
import { useI18n } from "@/lib/i18n/client";
import { countryName, industryLabel, regionLabel, topicLabel, typeLabel } from "@/lib/i18n/labels";
import { CONTENT_TYPES, INDUSTRIES, REGIONS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

type Key = "country" | "region" | "industry" | "type" | "range" | "from" | "to" | "q" | "sort" | "scope" | "topic" | "org";

/** URL-driven filters: every control writes to the query string the server reads. */
export function FilterBar({ hide = [], className }: { hide?: Key[]; className?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [keyword, setKeyword] = useState(sp.get("q") ?? "");

  const list = (k: Key) => (sp.get(k) ?? "").split(",").filter(Boolean);
  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(sp.toString());
    mutate(next);
    next.delete("limit");
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  const toggleIn = (k: Key, v: string) =>
    update((p) => {
      const cur = (p.get(k) ?? "").split(",").filter(Boolean);
      const nextVals = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      if (nextVals.length) p.set(k, nextVals.join(","));
      else p.delete(k);
    });
  const setOne = (k: Key, v: string | null) => update((p) => (v ? p.set(k, v) : p.delete(k)));

  const range = sp.get("range") ?? "";
  const active = useMemo(() => {
    const out: { key: Key; value: string; label: string }[] = [];
    for (const c of list("country")) out.push({ key: "country", value: c, label: countryName(c, locale) });
    for (const r of list("region")) out.push({ key: "region", value: r, label: regionLabel(r, locale) });
    for (const i of list("industry")) out.push({ key: "industry", value: i, label: industryLabel(i, locale) });
    for (const ty of list("type")) out.push({ key: "type", value: ty, label: typeLabel(ty, locale) });
    for (const tp of list("topic")) out.push({ key: "topic", value: tp, label: topicLabel(tp, locale) });
    if (sp.get("org")) out.push({ key: "org", value: sp.get("org")!, label: sp.get("org")! });
    if (sp.get("scope") === "global") out.push({ key: "scope", value: "global", label: t.filters.globalOnly });
    if (range === "custom") out.push({ key: "range", value: "custom", label: `${sp.get("from") ?? "…"} → ${sp.get("to") ?? "…"}` });
    else if (range && range !== "all") out.push({ key: "range", value: range, label: t.filters[range as "24h" | "7d" | "30d"] ?? range });
    if (sp.get("q")) out.push({ key: "q", value: sp.get("q")!, label: `“${sp.get("q")}”` });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, locale]);

  const remove = (key: Key, value: string) => {
    if (key === "range") update((p) => ["range", "from", "to"].forEach((k) => p.delete(k)));
    else if (["country", "region", "industry", "type", "topic"].includes(key)) toggleIn(key, value);
    else {
      if (key === "q") setKeyword("");
      setOne(key, null);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex h-9 min-w-0 flex-1 items-center rounded-full border border-line bg-surface px-3.5 sm:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            setOne("q", keyword.trim() || null);
          }}
          role="search"
        >
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t.filters.keyword} aria-label={t.filters.keyword} className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted" />
        </form>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn("inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors", open ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface text-ink")}
        >
          <SlidersHorizontal className="size-3.5" />
          {t.filters.title}
          {active.length > 0 && <span className={cn("grid size-5 place-items-center rounded-full text-[11px] tabular", open ? "bg-bg text-ink" : "bg-ink text-bg")}>{active.length}</span>}
        </button>
        {!hide.includes("sort") && (
          <div className="ml-auto inline-flex h-9 items-center rounded-full border border-line bg-surface p-0.5 text-[12.5px]" role="group" aria-label={t.filters.sort}>
            {(["latest", "top"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={(sp.get("sort") ?? "latest") === s} onClick={() => setOne("sort", s === "latest" ? null : s)} className={cn("h-full rounded-full px-3", (sp.get("sort") ?? "latest") === s ? "bg-surface-2 font-medium text-ink" : "text-muted")}>
                {s === "latest" ? t.filters.sortLatest : t.filters.sortTop}
              </button>
            ))}
          </div>
        )}
      </div>

      {active.length > 0 && (
        <div className={cn("flex flex-wrap items-center gap-1.5", pending && "opacity-60")}>
          {active.map((a) => (
            <button key={`${a.key}:${a.value}`} type="button" onClick={() => remove(a.key, a.value)} className="inline-flex h-7 items-center gap-1 rounded-full bg-accent-soft pl-2.5 pr-1.5 text-[12.5px] text-accent-2 hover:bg-accent-soft/70">
              {a.label}
              <X className="size-3.5" aria-label={t.filters.reset} />
            </button>
          ))}
          <button type="button" onClick={() => { setKeyword(""); start(() => router.replace(pathname, { scroll: false })); }} className="ml-1 text-[12.5px] text-muted underline-offset-2 hover:text-ink hover:underline">
            {t.common.clearFilters}
          </button>
        </div>
      )}

      {open && (
        <div className="animate-fade-up grid gap-6 rounded-2xl border border-line bg-surface p-5 md:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr]">
          {!hide.includes("country") && (
            <fieldset className="space-y-2.5">
              <legend className="eyebrow mb-2">{t.filters.geography}</legend>
              <CountrySearch counts={new Map()} onSelect={(c) => toggleIn("country", c)} className="[&_input]:text-[13px] [&>div]:h-9 [&>div]:shadow-none" />
              <div className="flex flex-wrap gap-1.5">
                {REGIONS.map((r) => (
                  <Chip key={r.slug} active={list("region").includes(r.slug)} onClick={() => toggleIn("region", r.slug)} className="h-7 px-2.5 text-[12px]">{r[locale]}</Chip>
                ))}
                <Chip active={sp.get("scope") === "global"} onClick={() => setOne("scope", sp.get("scope") === "global" ? null : "global")} className="h-7 px-2.5 text-[12px]">{t.common.global}</Chip>
              </div>
            </fieldset>
          )}
          {!hide.includes("industry") && (
            <fieldset>
              <legend className="eyebrow mb-2">{t.filters.industry}</legend>
              <div className="flex flex-wrap gap-1.5">
                {INDUSTRIES.map((i) => (
                  <Chip key={i.slug} active={list("industry").includes(i.slug)} onClick={() => toggleIn("industry", i.slug)} className="h-7 px-2.5 text-[12px]">{i[locale]}</Chip>
                ))}
              </div>
            </fieldset>
          )}
          <div className="space-y-6">
            {!hide.includes("type") && (
              <fieldset>
                <legend className="eyebrow mb-2">{t.filters.type}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_TYPES.map((ty) => (
                    <Chip key={ty.slug} active={list("type").includes(ty.slug)} onClick={() => toggleIn("type", ty.slug)} className="h-7 px-2.5 text-[12px]">{ty[locale]}</Chip>
                  ))}
                </div>
              </fieldset>
            )}
            {!hide.includes("range") && (
              <fieldset>
                <legend className="eyebrow mb-2">{t.filters.period}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {(["", "24h", "7d", "30d", "custom"] as const).map((r) => (
                    <Chip key={r || "any"} active={range === r || (!range && !r)} onClick={() => update((p) => { if (r) p.set("range", r); else p.delete("range"); if (r !== "custom") { p.delete("from"); p.delete("to"); } })} className="h-7 px-2.5 text-[12px]">
                      {r === "" ? t.filters.any : t.filters[r]}
                    </Chip>
                  ))}
                </div>
                {range === "custom" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                    <label className="flex items-center gap-1.5">
                      {t.filters.from}
                      <input type="date" value={sp.get("from") ?? ""} onChange={(e) => setOne("from", e.target.value || null)} className="h-8 rounded-lg border border-line bg-surface px-2 text-ink" />
                    </label>
                    <label className="flex items-center gap-1.5">
                      {t.filters.to}
                      <input type="date" value={sp.get("to") ?? ""} onChange={(e) => setOne("to", e.target.value || null)} className="h-8 rounded-lg border border-line bg-surface px-2 text-ink" />
                    </label>
                  </div>
                )}
              </fieldset>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
