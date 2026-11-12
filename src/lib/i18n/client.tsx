"use client";
import { createContext, useContext } from "react";
import type { Locale } from "@/lib/types";
import { dictionaries, type Dictionary } from "./dictionaries";

const Ctx = createContext<{ locale: Locale; t: Dictionary }>({ locale: "en", t: dictionaries.en });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, t: dictionaries[locale] }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
