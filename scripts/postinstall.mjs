// Copies runtime assets that must be served statically:
//  - MapLibre's self-contained worker bundle
//  - Natural Earth 1:50m country boundaries (TopoJSON, public domain via world-atlas)
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const copies = [
  ["node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/vendor/maplibre-gl-worker.mjs"],
  ["node_modules/world-atlas/countries-50m.json", "public/geo/countries-50m.json"],
];
for (const [from, to] of copies) {
  const src = join(root, from);
  if (!existsSync(src)) {
    console.warn(`[postinstall] missing ${from}, skipping`);
    continue;
  }
  mkdirSync(dirname(join(root, to)), { recursive: true });
  copyFileSync(src, join(root, to));
}
console.log("[postinstall] map assets ready");
