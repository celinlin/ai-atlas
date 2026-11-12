"use client";
import { Check } from "lucide-react";
import Link from "next/link";
import { COUNTRIES, countryByCode } from "@/lib/geo/countries";
import { useI18n } from "@/lib/i18n/client";
import { formatDate, industryLabel } from "@/lib/i18n/labels";
import { achievementStatus, weeklyChallenge } from "@/lib/passport";
import { useAtlas, useHydrated } from "@/lib/store/atlas-store";
import { REGIONS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

function Progress({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out-soft" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

export function Passport() {
  const { t, locale } = useI18n();
  const hydrated = useHydrated();
  const ex = useAtlas((s) => s.explorer);
  if (!hydrated) return <div className="skeleton h-80" />;
  const explored = Object.entries(ex.countries).sort((a, b) => a[1].localeCompare(b[1]));
  const achievements = achievementStatus(ex);
  const challenge = weeklyChallenge(ex);
  const totalsByRegion = new Map(REGIONS.map((r) => [r.slug, COUNTRIES.filter((c) => c.region === r.slug && c.ind).length]));

  return (
    <div className="space-y-10">
      {/* Passport cover */}
      <section className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="grid gap-px bg-line sm:grid-cols-4">
          {[
            { label: t.profile.explored, value: explored.length },
            { label: t.profile.industries, value: Object.keys(ex.industries).filter((i) => i !== "general").length },
            { label: t.profile.reads, value: ex.reads.length },
            { label: t.profile.sources, value: ex.sourcesOpened },
          ].map((s) => (
            <div key={s.label} className="bg-surface p-5">
              <p className="font-display text-[36px] leading-none text-ink tabular">{s.value}</p>
              <p className="mt-2 text-[12.5px] text-muted">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-line p-5">
          <h3 className="eyebrow mb-3">{t.profile.byRegion}</h3>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {REGIONS.map((r) => {
              const n = explored.filter(([c]) => countryByCode.get(c)?.region === r.slug).length;
              return (
                <div key={r.slug}>
                  <div className="mb-1.5 flex justify-between text-[12.5px]"><span className="text-ink-2">{r[locale]}</span><span className="text-muted tabular">{n}/{totalsByRegion.get(r.slug)}</span></div>
                  <Progress value={n} max={totalsByRegion.get(r.slug) ?? 1} />
                </div>
              );
            })}
          </div>
        </div>
        {explored.length > 0 && (
          <div className="border-t border-line p-5">
            <ul className="flex flex-wrap gap-2">
              {explored.map(([code, at]) => (
                <li key={code}>
                  <Link
                    href={`/country/${code}`}
                    title={`${locale === "fr" ? countryByCode.get(code)?.fr : countryByCode.get(code)?.en} · ${formatDate(at, locale)}`}
                    className="grid h-11 w-14 place-items-center rounded-md border border-dashed border-accent/50 font-mono text-[13px] font-medium tracking-wider text-accent-2 transition-colors hover:border-accent hover:bg-accent-soft"
                  >
                    {code}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Weekly challenge */}
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1">{t.profile.challenge} · {challenge.key}</p>
          <p className="font-display text-[19px] text-ink">{challenge.title[locale]}</p>
          <div className="mt-3 flex items-center gap-3">
            <Progress value={challenge.current} max={challenge.target} />
            <span className="shrink-0 text-[12.5px] text-muted tabular">{challenge.current}/{challenge.target}</span>
          </div>
        </div>
        <Link href={challenge.href} className="inline-flex h-9 shrink-0 items-center rounded-full border border-line-strong px-4 text-[13px] hover:border-ink/40">{t.nav.explore}</Link>
      </section>

      {/* Achievements */}
      <section>
        <h2 className="font-display mb-4 text-2xl text-ink">{t.profile.achievements}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => (
            <li key={a.slug} className={cn("rounded-2xl border p-4", a.unlocked ? "border-accent/40 bg-accent-soft/50" : "border-line bg-surface")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14.5px] font-medium text-ink">{a.name[locale]}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{a.description[locale]}</p>
                </div>
                {a.unlocked ? (
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-accent-ink" aria-label={t.profile.unlocked}><Check className="size-3.5" /></span>
                ) : (
                  <span className="shrink-0 text-[12px] text-muted tabular">{a.current}/{a.target}</span>
                )}
              </div>
              {!a.unlocked && <div className="mt-3"><Progress value={a.current} max={a.target} /></div>}
            </li>
          ))}
        </ul>
        {Object.keys(ex.industries).length > 0 && (
          <p className="mt-4 text-[12.5px] text-muted">{t.profile.industries}: {Object.keys(ex.industries).map((i) => industryLabel(i, locale)).join(" · ")}</p>
        )}
      </section>
    </div>
  );
}
