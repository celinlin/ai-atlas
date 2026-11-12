"use client";
import type { FeatureCollection, Geometry, Position } from "geojson";
import type { GeoJSONSource, Map as MlMap, MapLayerMouseEvent } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { codeByMapName, codeByNumeric, countryByCode } from "@/lib/geo/countries";
import { useI18n } from "@/lib/i18n/client";
import { countryName } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";
import { activityLevel, DARK, LIGHT, type MapPalette } from "./palette";

export interface MapApi {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
  setProjection(p: "globe" | "mercator"): void;
}

export interface WorldMapProps {
  activity: { code: string; count: number }[];
  selected?: string | null;
  onSelect?: (code: string | null) => void;
  projection?: "globe" | "mercator";
  /** Extra padding when focusing a country (room for side panel / bottom sheet). */
  focusPadding?: { top: number; right: number; bottom: number; left: number };
  /** Homepage mode: two-finger / ctrl scroll gestures so the page still scrolls. */
  cooperative?: boolean;
  apiRef?: React.RefObject<MapApi | null>;
  className?: string;
  label?: string;
}

const SMALL_AREA_KM2 = 60_000;
const INITIAL_CENTER: [number, number] = [18, 24];

/** Fit the whole world (or globe) to the container. */
function initialZoom(w: number, h: number, projection: "globe" | "mercator") {
  const size = Math.min(w, h * 1.05);
  // A globe of zoom z has a diameter of roughly 512 * 2^z / π px at the equator.
  if (projection === "globe") return Math.max(0, Math.log2((size * 0.86 * Math.PI) / 512));
  return Math.max(0, Math.log2(w / 512) - 0.05);
}
let geoCache: Promise<FeatureCollection<Geometry, { code: string; name: string }>> | null = null;

function loadGeo() {
  geoCache ??= fetch("/geo/countries-50m.json")
    .then((r) => r.json() as Promise<Topology>)
    .then((topo) => {
      const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
      return {
        type: "FeatureCollection" as const,
        features: fc.features
          .map((f) => {
            const code = (f.id != null ? codeByNumeric.get(String(Number(f.id))) : undefined) ?? codeByMapName[f.properties.name] ?? "";
            return { ...f, id: undefined, properties: { code, name: f.properties.name } };
          })
          .filter((f) => f.properties.name !== "Antarctica" || true),
      };
    });
  return geoCache;
}

function graticule(): FeatureCollection {
  const lines: Position[][] = [];
  for (let lng = -180; lng <= 180; lng += 30) lines.push(Array.from({ length: 37 }, (_, i) => [lng, -90 + i * 5]));
  for (let lat = -60; lat <= 60; lat += 30) lines.push(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat]));
  return { type: "FeatureCollection", features: lines.map((coordinates) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } })) };
}

function bbox(g: Geometry): [number, number, number, number] | null {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const visit = (c: unknown): void => {
    if (typeof (c as number[])[0] === "number") {
      const [x, y] = c as number[];
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    } else (c as unknown[]).forEach(visit);
  };
  if ("coordinates" in g) visit(g.coordinates);
  return maxX >= minX ? [minX, minY, maxX, maxY] : null;
}

export function WorldMap({ activity, selected, onSelect, projection = "globe", focusPadding, cooperative, apiRef, className, label }: WorldMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const geoRef = useRef<Awaited<ReturnType<typeof loadGeo>> | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; code: string } | null>(null);
  const { resolvedTheme } = useTheme();
  const { locale, t } = useI18n();
  const palette: MapPalette = resolvedTheme === "dark" ? DARK : LIGHT;
  const paletteRef = useRef(palette);
  const onSelectRef = useRef(onSelect);
  const hoverRef = useRef<string | null>(null);
  const counts = useMemo(() => new Map(activity.map((a) => [a.code, a.count])), [activity]);
  useEffect(() => {
    paletteRef.current = palette;
    onSelectRef.current = onSelect;
  });

  // ---- init ----
  useEffect(() => {
    let disposed = false;
    let map: MlMap | null = null;
    (async () => {
      try {
        const ml = await import("maplibre-gl");
        ml.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
        const geo = await loadGeo();
        if (disposed || !container.current) return;
        geoRef.current = geo;
        const p = paletteRef.current;
        map = new ml.Map({
          container: container.current,
          style: {
            version: 8,
            projection: { type: projection },
            sources: {},
            layers: [{ id: "bg", type: "background", paint: { "background-color": p.ocean } }],
          },
          center: INITIAL_CENTER,
          zoom: initialZoom(container.current.clientWidth, container.current.clientHeight, projection),
          minZoom: 0,
          maxZoom: 7,
          attributionControl: { compact: true, customAttribution: "Boundaries: Natural Earth" },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          cooperativeGestures: cooperative,
          renderWorldCopies: false,
        });
        map.touchZoomRotate.disableRotation();
        mapRef.current = map;
        if (process.env.NODE_ENV !== "production") (window as unknown as { __atlasMap?: MlMap }).__atlasMap = map;
        map.on("load", () => {
          if (!map) return;
          map.addSource("graticule", { type: "geojson", data: graticule() });
          map.addSource("countries", { type: "geojson", data: geo as never, promoteId: "code" });
          map.addSource("dots", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({ id: "graticule", type: "line", source: "graticule", paint: { "line-color": p.graticule, "line-width": 0.6 } });
          map.addLayer({ id: "countries-fill", type: "fill", source: "countries", paint: { "fill-color": fillExpr(p), "fill-opacity": 1 } });
          map.addLayer({ id: "countries-border", type: "line", source: "countries", paint: { "line-color": p.border, "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.3, 4, 0.9] } });
          map.addLayer({ id: "countries-hover", type: "line", source: "countries", paint: { "line-color": p.hover, "line-width": 1.1, "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.6, 0] } });
          map.addLayer({ id: "countries-selected", type: "line", source: "countries", filter: ["==", ["get", "code"], "__none__"], paint: { "line-color": p.outline, "line-width": 1.6 } });
          map.addLayer({
            id: "dots", type: "circle", source: "dots",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["get", "level"], 1, 3, 5, 6.5],
              "circle-color": p.dot,
              "circle-stroke-color": p.dotStroke,
              "circle-stroke-width": 1.2,
              "circle-opacity": 0.95,
            },
          });

          const codeAt = (e: MapLayerMouseEvent) => (e.features?.[0]?.properties?.code as string) || null;
          map.on("mousemove", "countries-fill", (e) => {
            const code = codeAt(e);
            if (hoverRef.current !== code) {
              if (hoverRef.current) map!.setFeatureState({ source: "countries", id: hoverRef.current }, { hover: false });
              if (code) map!.setFeatureState({ source: "countries", id: code }, { hover: true });
              hoverRef.current = code;
            }
            map!.getCanvas().style.cursor = code ? "pointer" : "";
            setTip(code && window.matchMedia("(hover: hover)").matches ? { x: e.point.x, y: e.point.y, code } : null);
          });
          map.on("mouseleave", "countries-fill", () => {
            if (hoverRef.current) map!.setFeatureState({ source: "countries", id: hoverRef.current }, { hover: false });
            hoverRef.current = null;
            map!.getCanvas().style.cursor = "";
            setTip(null);
          });
          map.on("click", "countries-fill", (e) => {
            const code = codeAt(e);
            if (code) onSelectRef.current?.(code);
          });
          map.on("click", "dots", (e) => {
            const code = e.features?.[0]?.properties?.code as string | undefined;
            if (code) onSelectRef.current?.(code);
          });
          setReady(true);
        });
      } catch (e) {
        console.error("[map] failed to initialise", e);
        setFailed(true);
      }
    })();
    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- imperative API ----
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      zoomIn: () => mapRef.current?.zoomIn({ duration: 300 }),
      zoomOut: () => mapRef.current?.zoomOut({ duration: 300 }),
      reset: () => mapRef.current?.flyTo({ center: INITIAL_CENTER, zoom: initialZoom(container.current?.clientWidth ?? 1000, container.current?.clientHeight ?? 600, mapRef.current.getProjection()?.type === "mercator" ? "mercator" : "globe"), duration: 900 }),
      setProjection: (p) => {
        mapRef.current?.setProjection({ type: p });
        mapRef.current?.easeTo({ zoom: initialZoom(container.current?.clientWidth ?? 1000, container.current?.clientHeight ?? 600, p), duration: 600 });
      },
    };
  }, [apiRef, ready]);

  // ---- activity → feature-state + dots ----
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !geoRef.current) return;
    const max = Math.max(1, ...counts.values());
    for (const f of geoRef.current.features) {
      const code = f.properties.code;
      if (!code) continue;
      map.setFeatureState({ source: "countries", id: code }, { level: activityLevel(counts.get(code) ?? 0, max) });
    }
    const dots = [...counts.entries()]
      .map(([code, count]) => ({ c: countryByCode.get(code), code, count }))
      .filter((x) => x.c && x.count > 0 && x.c.area < SMALL_AREA_KM2)
      .map((x) => ({ type: "Feature" as const, properties: { code: x.code, level: activityLevel(x.count, max) }, geometry: { type: "Point" as const, coordinates: [x.c!.ll[1], x.c!.ll[0]] } }));
    (map.getSource("dots") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: dots });
  }, [counts, ready]);

  // ---- theme ----
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setPaintProperty("bg", "background-color", palette.ocean);
    map.setPaintProperty("graticule", "line-color", palette.graticule);
    map.setPaintProperty("countries-fill", "fill-color", fillExpr(palette));
    map.setPaintProperty("countries-border", "line-color", palette.border);
    map.setPaintProperty("countries-hover", "line-color", palette.hover);
    map.setPaintProperty("countries-selected", "line-color", palette.outline);
    map.setPaintProperty("dots", "circle-color", palette.dot);
    map.setPaintProperty("dots", "circle-stroke-color", palette.dotStroke);
  }, [palette, ready]);

  // ---- selection: highlight + smooth focus ----
  const prevSelected = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (prevSelected.current) map.setFeatureState({ source: "countries", id: prevSelected.current }, { selected: false });
    map.setFilter("countries-selected", ["==", ["get", "code"], selected ?? "__none__"]);
    prevSelected.current = selected ?? null;
    if (!selected) return;
    map.setFeatureState({ source: "countries", id: selected }, { selected: true });
    const f = geoRef.current?.features.find((x) => x.properties.code === selected);
    const c = countryByCode.get(selected);
    const padding = focusPadding ?? { top: 40, right: 40, bottom: 40, left: 40 };
    const b = f ? bbox(f.geometry) : null;
    map.resize(); // the container may have just changed size (mobile sheet)
    // Keep at least a 120px viewport for the country; shrink padding otherwise.
    const el = map.getContainer();
    const scale = Math.min(1, Math.max(0, (el.clientHeight - 120) / Math.max(1, padding.top + padding.bottom)), Math.max(0, (el.clientWidth - 120) / Math.max(1, padding.left + padding.right)));
    const pad = { top: padding.top * scale, bottom: padding.bottom * scale, left: padding.left * scale, right: padding.right * scale };
    const camera = b && b[2] - b[0] < 170 ? map.cameraForBounds([[b[0], b[1]], [b[2], b[3]]], { padding: pad, maxZoom: 4.2 }) : undefined;
    if (camera && b) {
      // Use the fitted zoom, but let flyTo's padding offset the visual center (reliable on the globe too).
      map.flyTo({ center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], zoom: camera.zoom, padding: pad, duration: 1100, essential: true });
    }
    else if (c) map.flyTo({ center: [c.ll[1], c.ll[0]], zoom: f ? 2 : 4.5, padding: pad, duration: 1100, essential: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, ready]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0">
        <div ref={container} className="h-full w-full" role="region" aria-label={label ?? t.map.hint} />
      </div>
      {!ready && !failed && <div className="absolute inset-0 grid place-items-center"><div className="skeleton size-40 rounded-full opacity-60" /></div>}
      {failed && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">{t.common.error}</div>}
      {tip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border border-line bg-surface px-3 py-2 shadow-panel"
          style={{ left: tip.x, top: tip.y }}
        >
          <p className="text-[13px] font-medium text-ink">{countryName(tip.code, locale)}</p>
          <p className="text-[12px] text-muted tabular">
            {counts.get(tip.code) ? `${counts.get(tip.code)} ${t.common.stories}` : t.map.none}
          </p>
        </div>
      )}
    </div>
  );
}

function fillExpr(p: MapPalette) {
  return [
    "case",
    ["boolean", ["feature-state", "selected"], false], p.steps[4],
    ["==", ["get", "code"], ""], p.land,
    ["match", ["coalesce", ["feature-state", "level"], 0], 1, p.steps[0], 2, p.steps[1], 3, p.steps[2], 4, p.steps[3], 5, p.steps[4], p.land],
  ] as never;
}
