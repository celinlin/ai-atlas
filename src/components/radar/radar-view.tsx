"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { countryName, industryLabel, topicLabel } from "@/lib/i18n/labels";
import { actions, useAtlas, useHydrated } from "@/lib/store/atlas-store";
import { PreferencePicker } from "./preference-picker";
import { RadarFeed } from "./radar-feed";

export function RadarView() {
  const { t, locale } = useI18n();
  const hydrated = useHydrated();
  const prefs = useAtlas((s) => s.prefs);
  const [editing, setEditing] = useState(false);
  const showPicker = hydrated && (editing || !prefs.onboarded);

  if (!hydrated) return <div className="skeleton h-40 w-full" />;
  if (showPicker)
    return (
      <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
        <h2 className="font-display text-[28px] text-ink">{t.radar.setup}</h2>
        <p className="mb-7 mt-1 text-[14.5px] text-ink-2">{t.radar.setupLead}</p>
        <PreferencePicker />
        <div className="mt-8 flex items-center gap-3">
          <Button variant="primary" onClick={() => { actions.setOnboarded(); setEditing(false); }}>{t.radar.done}</Button>
        </div>
      </section>
    );

  const summary = [...prefs.countries.map((c) => countryName(c, locale)), ...prefs.industries.map((i) => industryLabel(i, locale)), ...prefs.topics.map((x) => topicLabel(x, locale))];
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 md:flex-row md:items-center">
        <p className="min-w-0 flex-1 text-[13.5px] text-ink-2">
          <span className="eyebrow mr-2">{t.common.following}</span>
          {summary.length ? summary.join(" · ") : "—"}
        </p>
        <Button size="sm" onClick={() => setEditing(true)}>{t.radar.edit}</Button>
      </div>
      <RadarFeed limit={30} />
      <details className="mt-10 rounded-2xl bg-surface-2 p-5 text-[13.5px] text-ink-2">
        <summary className="cursor-pointer font-medium text-ink">{t.radar.howItWorks}</summary>
        <p className="mt-2 leading-relaxed">{t.radar.howItWorksBody}</p>
      </details>
    </>
  );
}
