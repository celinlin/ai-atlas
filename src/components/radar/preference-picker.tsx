"use client";
import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/chip";
import { COUNTRIES } from "@/lib/geo/countries";
import { useI18n } from "@/lib/i18n/client";
import { countryName } from "@/lib/i18n/labels";
import { actions, useAtlas } from "@/lib/store/atlas-store";
import { INDUSTRIES, TOPICS } from "@/lib/taxonomy";

const SUGGESTED = ["US", "CN", "FR", "GB", "DE", "IN", "JP", "KR", "CA", "BR", "KE", "NG", "AE", "SG", "IL", "ZA", "AU", "MX"];

export function PreferencePicker() {
  const { t, locale } = useI18n();
  const prefs = useAtlas((s) => s.prefs);
  const [q, setQ] = useState("");
  const countries = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return [...new Set([...prefs.countries, ...SUGGESTED])];
    return COUNTRIES.filter((c) => c.en.toLowerCase().includes(n) || c.fr.toLowerCase().includes(n)).slice(0, 18).map((c) => c.code);
  }, [q, prefs.countries]);

  return (
    <div className="space-y-7">
      <fieldset>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <legend className="eyebrow">{t.radar.countries}</legend>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.map.searchCountry} aria-label={t.map.searchCountry} className="h-8 w-44 rounded-full border border-line bg-surface px-3 text-[12.5px] outline-none focus:border-line-strong" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {countries.map((c) => (
            <Chip key={c} active={prefs.countries.includes(c)} onClick={() => actions.toggleFollowCountry(c)}>{countryName(c, locale)}</Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow mb-2.5">{t.radar.industries}</legend>
        <div className="flex flex-wrap gap-1.5">
          {INDUSTRIES.filter((i) => i.slug !== "general").map((i) => (
            <Chip key={i.slug} active={prefs.industries.includes(i.slug)} onClick={() => actions.toggleFollowIndustry(i.slug)}>{i[locale]}</Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow mb-2.5">{t.radar.topics}</legend>
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map((tp) => (
            <Chip key={tp.slug} active={prefs.topics.includes(tp.slug)} onClick={() => actions.toggleFollowTopic(tp.slug)}>{tp[locale]}</Chip>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
