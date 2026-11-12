"use client";
import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BarList, Sparkline } from "@/components/charts/sparkline";
import { PeriodChips } from "@/components/filters/period-chips";
import { NewsCard, NewsCardSkeleton } from "@/components/news/news-card";
import { Chip } from "@/components/ui/chip";
import { countryByCode } from "@/lib/geo/countries";
import { format } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/client";
import { countryName, industryLabel, regionLabel, topicLabel, typeLabel } from "@/lib/i18n/labels";
import { actions } from "@/lib/store/atlas-store";
import type { Article, CountryProfile, IndustrySlug, TimeRange } from "@/lib/types";
import { FollowButton } from "./follow-button";

interface Payload {
  profile: CountryProfile;
  articles: { items: Article[]; total: number };
}

export function CountryPanel({ code, range, onRangeChange, onClose }: { code: string; range: TimeRange; onRangeChange: (r: TimeRange) => void; onClose?: () => void }) {
  const { t, locale } = useI18n();
  const [industry, setIndustry] = useState<IndustrySlug | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const key = `${code}|${range}|${industry ?? ""}|${reloadKey}`;
  const [result, setResult] = useState<{ key: string; data: Payload | null; error: boolean }>({ key: "", data: null, error: false });
  const loading = result.key !== key;
  const data = result.data;
  const error = !loading && result.error;
  const c = countryByCode.get(code);

  useEffect(() => {
    actions.exploreCountry(code);
  }, [code]);
  useEffect(() => {
    const ctrl = new AbortController();
    const sp = new URLSearchParams({ range, limit: "12" });
    if (industry) sp.set("industry", industry);
    fetch(`/api/countries/${code}?${sp}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Payload) => setResult({ key, data: d, error: false }))
      .catch((e) => e.name !== "AbortError" && setResult((r) => ({ key, data: r.data, error: true })));
    return () => ctrl.abort();
  }, [code, range, industry, key]);

  const name = countryName(code, locale);
  const p = data?.profile;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-line px-5 pb-4 pt-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{c ? regionLabel(c.region, locale) : ""} · {t.country.intelligence}</p>
            <h2 className="font-display mt-1 text-[30px] leading-[1.05] text-ink">{name}</h2>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label={t.common.close} className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <FollowButton kind="country" id={code} />
          <Link href={`/country/${code}`} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] text-muted hover:text-ink">
            {t.country.openFull}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Filters */}
        <div className="space-y-2.5 border-b border-line px-5 py-3.5">
          <PeriodChips value={range} onChange={onRangeChange} size="sm" />
          {(p?.industries.length ?? 0) > 0 || industry ? (
            <div className="scrollbar-none -mx-5 flex gap-1.5 overflow-x-auto px-5" role="group" aria-label={t.country.filterIndustry}>
              <Chip active={!industry} onClick={() => setIndustry(null)} className="h-7 px-2.5 text-[12px]">{t.common.all}</Chip>
              {(industry && !p?.industries.some((i) => i.slug === industry) ? [{ slug: industry, count: 0 }, ...(p?.industries ?? [])] : p?.industries ?? []).map((i) => (
                <Chip key={i.slug} active={industry === i.slug} onClick={() => setIndustry(industry === i.slug ? null : i.slug)} className="h-7 px-2.5 text-[12px]">
                  {industryLabel(i.slug, locale)}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="p-5 text-sm text-muted">
            {t.common.error}{" "}
            <button className="font-medium text-ink underline" onClick={() => setReloadKey((k) => k + 1)}>{t.common.retry}</button>
          </div>
        ) : !p ? (
          <div className="space-y-6 p-5">{[0, 1, 2].map((i) => <NewsCardSkeleton key={i} />)}</div>
        ) : (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {/* Overview */}
            <div className="grid grid-cols-[auto_1fr] items-end gap-5 px-5 py-5">
              <div>
                <p className="font-display text-[40px] leading-none text-ink tabular">{p.total}</p>
                <p className="mt-1 text-[12px] text-muted">{t.country.stories}</p>
              </div>
              <div>
                <Sparkline values={p.daily.map((d) => d.count)} label={t.country.activity} />
                <p className="mt-1 text-right text-[11px] text-muted">{t.country.activity}</p>
              </div>
            </div>

            {p.total === 0 ? (
              <p className="px-5 pb-6 text-[14px] leading-relaxed text-muted">{format(t.country.empty, { country: name })}</p>
            ) : (
              <>
                {p.industries.length > 0 && (
                  <section className="px-5 pb-5">
                    <h3 className="eyebrow mb-2">{t.country.sectors}</h3>
                    <BarList
                      items={p.industries.slice(0, 5).map((i) => ({ key: i.slug, label: industryLabel(i.slug, locale), value: i.count }))}
                      onSelect={(k) => setIndustry(industry === k ? null : (k as IndustrySlug))}
                      activeKey={industry}
                    />
                  </section>
                )}
                <section className="flex flex-wrap gap-x-6 gap-y-4 px-5 pb-5">
                  {p.types.length > 0 && (
                    <div className="min-w-0">
                      <h3 className="eyebrow mb-2">{t.country.types}</h3>
                      <p className="text-[13px] leading-relaxed text-ink-2">{p.types.slice(0, 4).map((x) => `${typeLabel(x.slug, locale)} ${x.count}`).join(" · ")}</p>
                    </div>
                  )}
                  {p.organizations.length > 0 && (
                    <div className="min-w-0">
                      <h3 className="eyebrow mb-2">{t.country.organizations}</h3>
                      <p className="text-[13px] leading-relaxed text-ink-2">{p.organizations.slice(0, 5).map((o) => o.name).join(", ")}</p>
                    </div>
                  )}
                  {p.topics.length > 0 && (
                    <div className="min-w-0">
                      <h3 className="eyebrow mb-2">{t.country.topics}</h3>
                      <p className="text-[13px] leading-relaxed text-ink-2">{p.topics.slice(0, 4).map((x) => topicLabel(x.topic, locale)).join(" · ")}</p>
                    </div>
                  )}
                </section>
                <section className="border-t border-line px-5 pt-5">
                  <h3 className="eyebrow mb-1">{t.country.latest}</h3>
                  <div className="divide-y divide-line">
                    {data!.articles.items.map((a) => <NewsCard key={a.id} article={a} className="py-4" />)}
                  </div>
                  {data!.articles.total > data!.articles.items.length && (
                    <Link href={`/country/${code}?range=${range}${industry ? `&industry=${industry}` : ""}`} className="my-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent-2 hover:underline">
                      {t.common.seeAll} ({data!.articles.total})
                      <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </section>
              </>
            )}
            <p className="px-5 py-5 text-[11.5px] leading-relaxed text-muted">{t.country.publisherNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}
