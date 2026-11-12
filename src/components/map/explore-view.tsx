"use client";
import { Globe2, Map as MapIcon, Minus, Plus, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CountryPanel } from "@/components/country/country-panel";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PeriodChips } from "@/components/filters/period-chips";
import { isCountryCode } from "@/lib/geo/countries";
import { useI18n } from "@/lib/i18n/client";
import { useHydrated } from "@/lib/store/atlas-store";
import { countryName, industryLabel } from "@/lib/i18n/labels";
import { INDUSTRIES } from "@/lib/taxonomy";
import type { CountryActivity, IndustrySlug, TimeRange } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CountrySearch } from "./country-search";
import { DARK, LIGHT } from "./palette";
import { WorldMap, type MapApi } from "./world-map";
import { useTheme } from "next-themes";

export function ExploreView({ initialActivity, initialRange }: { initialActivity: CountryActivity[]; initialRange: TimeRange }) {
  const { t, locale } = useI18n();
  const sp = useSearchParams();
  const initialCode = sp.get("c")?.toUpperCase();
  const [selected, setSelected] = useState<string | null>(isCountryCode(initialCode) ? initialCode : null);
  const [range, setRange] = useState<TimeRange>(initialRange);
  const [industry, setIndustry] = useState<IndustrySlug | null>(null);
  const [activity, setActivity] = useState(initialActivity);
  const [projection, setProjection] = useState<"globe" | "mercator">("globe");
  const [isDesktop, setIsDesktop] = useState(true);
  const [viewportH, setViewportH] = useState(800);
  const api = useRef<MapApi | null>(null);
  const { resolvedTheme } = useTheme();
  const hydrated = useHydrated();
  const steps = (hydrated && resolvedTheme === "dark" ? DARK : LIGHT).steps;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => {
      setIsDesktop(mq.matches);
      setViewportH(document.documentElement.clientHeight);
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Map activity follows the same structured filters as the news feed.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const ctrl = new AbortController();
    const q = new URLSearchParams({ range });
    if (industry) q.set("industry", industry);
    fetch(`/api/stats?${q}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setActivity(d.activity ?? []))
      .catch(() => {});
    return () => ctrl.abort();
  }, [range, industry]);

  const select = useCallback(
    (code: string | null) => {
      setSelected(code);
      const next = new URLSearchParams(window.location.search);
      if (code) next.set("c", code);
      else next.delete("c");
      window.history.replaceState(null, "", `${window.location.pathname}${next.size ? `?${next}` : ""}`);
    },
    [],
  );

  const zoomIn = () => api.current?.zoomIn();
  const zoomOut = () => api.current?.zoomOut();
  const reset = () => {
    select(null);
    api.current?.reset();
  };
  const toggleProjection = () => {
    const p = projection === "globe" ? "mercator" : "globe";
    setProjection(p);
    api.current?.setProjection(p);
  };

  const counts = useMemo(() => new Map(activity.map((a) => [a.code, a.count])), [activity]);
  const total = useMemo(() => activity.reduce((s, a) => s + a.count, 0), [activity]);
  const sheetH = Math.round(viewportH * 0.42) - 60;
  const focusPadding = isDesktop ? { top: 80, right: 460, bottom: 60, left: 60 } : { top: 72, right: 56, bottom: 72, left: 56 };

  return (
    <div data-fullscreen className="relative flex-1 overflow-hidden pb-[60px] md:pb-0">
      {/* On mobile the map shrinks to the area above the bottom sheet, so the focused country stays centered. */}
      <div className="absolute inset-0 md:bottom-0" style={isDesktop ? undefined : { bottom: 60 + (selected ? sheetH : 0) }}>
        <WorldMap
          activity={activity}
          selected={selected}
          onSelect={select}
          projection={projection}
          focusPadding={focusPadding}
          apiRef={api}
          className="h-full w-full"
        />
      </div>

      {/* Top overlay: search + filters */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 md:p-5">
        <div className="pointer-events-auto flex max-w-[420px] flex-col gap-2.5">
          <CountrySearch counts={counts} onSelect={select} />
          <div className={cn("scrollbar-none -mx-3 gap-1.5 overflow-x-auto px-3 pb-1 md:mx-0 md:flex md:flex-wrap md:px-0", selected && !isDesktop ? "hidden" : "flex")}>
            <PeriodChips value={range} onChange={setRange} size="sm" />
            <span className="mx-0.5 w-px shrink-0 bg-line" aria-hidden />
            <select
              aria-label={t.filters.industry}
              value={industry ?? ""}
              onChange={(e) => setIndustry((e.target.value || null) as IndustrySlug | null)}
              className={cn("h-7 shrink-0 rounded-full border px-2.5 text-[12px] outline-none", industry ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2")}
            >
              <option value="">{t.filters.industry}: {t.common.all}</option>
              {INDUSTRIES.map((i) => (
                <option key={i.slug} value={i.slug}>{industryLabel(i.slug, locale)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend + hint */}
      <div className={cn("pointer-events-none absolute left-3 z-10 md:bottom-5 md:left-5", selected ? "bottom-[calc(42vh+8px)] hidden md:block" : "bottom-[72px]")}>
        <div className="pointer-events-auto rounded-xl border border-line bg-surface/90 px-3 py-2.5 backdrop-blur">
          <p className="eyebrow mb-1.5">{t.map.legend} · <span className="tabular">{total}</span></p>
          <div className="flex items-center gap-1">
            <span className="text-[10.5px] text-muted">1</span>
            {steps.map((c) => <span key={c} className="h-2 w-6 first:rounded-l-full last:rounded-r-full" style={{ background: c }} />)}
            <span className="text-[10.5px] text-muted">{Math.max(1, ...activity.map((a) => a.count))}</span>
          </div>
          {!selected && <p className="mt-2 hidden max-w-[220px] text-[11.5px] leading-snug text-muted md:block">{t.map.hint}</p>}
        </div>
      </div>

      {/* Map controls */}
      <div className={cn("absolute z-10 flex flex-col gap-1.5 transition-[right] duration-300", selected && isDesktop ? "right-[456px]" : "right-3 md:right-5", "top-[118px] md:top-5")}>
        <MapButton label={t.map.zoomIn} onClick={zoomIn}><Plus className="size-4" /></MapButton>
        <MapButton label={t.map.zoomOut} onClick={zoomOut}><Minus className="size-4" /></MapButton>
        <MapButton label={t.map.reset} onClick={reset}><RotateCcw className="size-4" /></MapButton>
        <MapButton label={projection === "globe" ? t.map.flat : t.map.globe} onClick={toggleProjection}>
          {projection === "globe" ? <MapIcon className="size-4" /> : <Globe2 className="size-4" />}
        </MapButton>
      </div>

      {/* Desktop panel */}
      {isDesktop && (
        <aside
          aria-label={selected ? countryName(selected, locale) : undefined}
          className={cn(
            "absolute bottom-5 right-5 top-5 z-20 w-[420px] overflow-hidden rounded-2xl border border-line bg-surface shadow-panel transition-[transform,opacity] duration-500 ease-out-soft",
            selected ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[110%] opacity-0",
          )}
        >
          {selected && <CountryPanel key={selected} code={selected} range={range} onRangeChange={setRange} onClose={() => select(null)} />}
        </aside>
      )}

      {/* Mobile bottom sheet */}
      {!isDesktop && (
        <BottomSheet open={!!selected} onClose={() => select(null)} label={selected ? countryName(selected, locale) : t.country.intelligence}>
          {selected && <CountryPanel key={selected} code={selected} range={range} onRangeChange={setRange} onClose={() => select(null)} />}
        </BottomSheet>
      )}

      {!selected && activity.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 text-center text-sm text-muted md:bottom-8">{t.map.noData}</div>
      )}
    </div>
  );
}


function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid size-9 place-items-center rounded-full border border-line bg-surface/95 text-ink-2 shadow-sm backdrop-blur transition-colors hover:text-ink">
      {children}
    </button>
  );
}
