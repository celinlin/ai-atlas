// Generates src/data/countries.json — a compact, curated subset of the
// `world-countries` dataset (ODbL) used for names, regions and geo-classification.
import { writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const world = require("world-countries");
const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));

function region(c) {
  const sub = c.subregion;
  if (c.region === "Americas") return sub === "North America" && ["US", "CA", "BM", "GL", "PM"].includes(c.cca2) ? "north-america" : "latin-america";
  if (c.region === "Europe") return "europe";
  if (c.region === "Africa") return sub === "Northern Africa" ? "mena" : "africa";
  if (c.region === "Asia") {
    if (sub === "Western Asia" && !["GE", "AM", "AZ", "CY"].includes(c.cca2)) return "mena";
    if (["GE", "AM", "AZ", "CY"].includes(c.cca2)) return "europe";
    return "asia";
  }
  if (c.region === "Oceania") return "oceania";
  return "other";
}

const out = world
  .filter((c) => c.cca2 && c.cca2 !== "AQ")
  .map((c) => ({
    code: c.cca2,
    num: c.ccn3 || null,
    a3: c.cca3,
    en: c.name.common,
    fr: c.translations?.fra?.common ?? c.name.common,
    official: c.name.official,
    region: region(c),
    sub: c.subregion || c.region,
    ll: c.latlng.map((n) => Math.round(n * 100) / 100),
    cap: c.capital?.[0] ?? null,
    dem: [c.demonyms?.eng?.m, c.demonyms?.eng?.f, c.demonyms?.fra?.m, c.demonyms?.fra?.f].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i),
    alt: (c.altSpellings || []).filter((s) => s.length > 3 && s !== c.name.common),
    area: c.area,
    ind: c.independent !== false,
  }))
  .sort((a, b) => a.en.localeCompare(b.en));

writeFileSync("src/data/countries.json", JSON.stringify(out));
console.log("countries:", out.length);

// Report map polygons that don't resolve to an ISO alpha-2 code.
const byNum = new Map(out.filter((c) => c.num).map((c) => [String(Number(c.num)), c.code]));
const unresolved = topo.objects.countries.geometries.filter((g) => !byNum.has(String(Number(g.id)))).map((g) => `${g.id}:${g.properties.name}`);
console.log("unresolved map polygons:", unresolved.join(", "));
