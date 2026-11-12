/** Applies supabase/migrations/*.sql and upserts reference data. Requires DATABASE_URL. */
import { readdirSync, readFileSync } from "node:fs";
import postgres from "postgres";
import { COUNTRIES } from "@/lib/geo/countries";
import { INDUSTRIES, TOPICS } from "@/lib/taxonomy";
import { ACHIEVEMENTS } from "@/lib/passport";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });
for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
  console.log(`applying ${f}`);
  await sql.unsafe(readFileSync(`supabase/migrations/${f}`, "utf8"));
}
for (const c of COUNTRIES)
  await sql`insert into countries values (${c.code}, ${c.en}, ${c.fr}, ${c.region}, ${c.sub}, ${c.ll[0]}, ${c.ll[1]})
            on conflict (code) do update set name_en = excluded.name_en, name_fr = excluded.name_fr, region = excluded.region`;
for (const i of INDUSTRIES) await sql`insert into industries values (${i.slug}, ${i.en}, ${i.fr}) on conflict (slug) do update set name_en = excluded.name_en, name_fr = excluded.name_fr`;
for (const t of TOPICS) await sql`insert into topics values (${t.slug}, ${t.en}, ${t.fr}) on conflict (slug) do update set name_en = excluded.name_en, name_fr = excluded.name_fr`;
for (const a of ACHIEVEMENTS)
  await sql`insert into achievements values (${a.slug}, ${a.name.en}, ${a.name.fr}, ${a.description.en}, ${a.description.fr}) on conflict (slug) do update set name_en = excluded.name_en`;
console.log(`reference data: ${COUNTRIES.length} countries, ${INDUSTRIES.length} industries, ${TOPICS.length} topics, ${ACHIEVEMENTS.length} achievements`);
await sql.end();
