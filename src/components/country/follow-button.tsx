"use client";
import { Check, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { actions, useAtlas } from "@/lib/store/atlas-store";
import type { IndustrySlug } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FollowButton({ kind, id, className }: { kind: "country" | "industry"; id: string; className?: string }) {
  const { t } = useI18n();
  const on = useAtlas((s) => (kind === "country" ? s.prefs.countries.includes(id) : s.prefs.industries.includes(id as IndustrySlug)));
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => (kind === "country" ? actions.toggleFollowCountry(id) : actions.toggleFollowIndustry(id as IndustrySlug))}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
        on ? "bg-accent-soft text-accent-2" : "border border-line-strong text-ink hover:border-ink/40",
        className,
      )}
    >
      {on ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      {on ? t.common.following : t.common.follow}
    </button>
  );
}
