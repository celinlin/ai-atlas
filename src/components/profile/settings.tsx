"use client";
import { useTheme } from "next-themes";
import { LocaleSwitch } from "@/components/layout/controls";
import { PreferencePicker } from "@/components/radar/preference-picker";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useI18n } from "@/lib/i18n/client";
import { actions, useHydrated } from "@/lib/store/atlas-store";

export function Settings() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();
  return (
    <section className="space-y-6 rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-2xl text-ink">{t.profile.preferences}</h2>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex items-center gap-3"><span className="eyebrow">{t.common.language}</span><LocaleSwitch /></div>
        <div className="flex items-center gap-2">
          <span className="eyebrow mr-1">{t.common.theme}</span>
          {(["light", "dark", "system"] as const).map((m) => (
            <Chip key={m} active={hydrated && theme === m} onClick={() => setTheme(m)} className="h-7 px-2.5 text-[12px]">{t.common[m]}</Chip>
          ))}
        </div>
      </div>
      <PreferencePicker />
      <div className="flex flex-wrap gap-2 border-t border-line pt-5">
        <Button size="sm" onClick={() => confirm(t.profile.confirmReset) && actions.resetPrefs()}>{t.profile.reset}</Button>
        <Button size="sm" variant="ghost" onClick={() => confirm(t.profile.confirmReset) && actions.resetPassport()}>{t.profile.resetPassport}</Button>
      </div>
    </section>
  );
}
