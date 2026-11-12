"use client";
import { Chip } from "@/components/ui/chip";
import { useI18n } from "@/lib/i18n/client";
import type { TimeRange } from "@/lib/types";

export const PERIODS: TimeRange[] = ["24h", "7d", "30d", "all"];
const SHORT = { en: { "24h": "24h", "7d": "7d", "30d": "30d" }, fr: { "24h": "24 h", "7d": "7 j", "30d": "30 j" } } as const;

export function PeriodChips({ value, onChange, size = "md" }: { value: TimeRange; onChange: (r: TimeRange) => void; size?: "sm" | "md" }) {
  const { t, locale } = useI18n();
  return (
    <div className="flex gap-1.5" role="group" aria-label={t.filters.period}>
      {PERIODS.map((r) => (
        <Chip
          key={r}
          active={value === r}
          onClick={() => onChange(r)}
          className={size === "sm" ? "h-7 px-2.5 text-[12px]" : undefined}
          title={r === "all" ? t.filters.any : t.filters[r as "24h" | "7d" | "30d"]}
        >
          {r === "all" ? t.filters.any : SHORT[locale][r as "24h" | "7d" | "30d"]}
        </Chip>
      ))}
    </div>
  );
}
