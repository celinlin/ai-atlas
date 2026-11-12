"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { useHydrated } from "@/lib/store/atlas-store";
import { cn } from "@/lib/utils";

function writeLocaleCookie(l: "en" | "fr") {
  document.cookie = `atlas-locale=${l}; path=/; max-age=31536000; samesite=lax`;
}

export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (l: "en" | "fr") => {
    writeLocaleCookie(l);
    start(() => router.refresh());
  };
  return (
    <div role="group" aria-label={t.common.language} className={cn("inline-flex h-8 items-center rounded-full border border-line bg-surface p-0.5 text-[12px] font-medium", pending && "opacity-60", className)}>
      {(["en", "fr"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          aria-pressed={locale === l}
          lang={l}
          className={cn("h-full rounded-full px-2.5 uppercase tracking-wide transition-colors", locale === l ? "bg-ink text-bg" : "text-muted hover:text-ink")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const hydrated = useHydrated();
  const dark = hydrated && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      aria-label={`${t.common.theme}: ${dark ? t.common.dark : t.common.light}`}
    >
      {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
