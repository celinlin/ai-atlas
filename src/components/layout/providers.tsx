"use client";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n/client";
import type { Locale } from "@/lib/types";

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </ThemeProvider>
  );
}
