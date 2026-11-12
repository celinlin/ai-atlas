import "server-only";
import { cookies, headers } from "next/headers";
import type { Locale } from "@/lib/types";
import { dictionaries } from "./dictionaries";

export const LOCALE_COOKIE = "atlas-locale";

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (c === "en" || c === "fr") return c;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^fr\b/i.test(accept.trim()) ? "fr" : "en";
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
