"use client";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto max-w-md px-4 py-32 text-center">
      <h1 className="font-display text-3xl text-ink">{t.common.error}</h1>
      <button onClick={reset} className="mt-6 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-bg">{t.common.retry}</button>
    </div>
  );
}
