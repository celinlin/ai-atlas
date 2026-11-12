"use client";
import { ArrowUpRight, Bookmark } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { actions, useAtlas } from "@/lib/store/atlas-store";
import type { Article } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SaveButton({ article, className, withLabel }: { article: Article; className?: string; withLabel?: boolean }) {
  const { t } = useI18n();
  const saved = useAtlas((s) => s.saved.some((x) => x.id === article.id));
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.toggleSave(article);
      }}
      aria-pressed={saved}
      aria-label={saved ? t.common.unsave : t.common.save}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full text-[12.5px] transition-colors",
        withLabel ? "h-9 border border-line-strong px-3.5 hover:border-ink/40" : "size-8 justify-center hover:bg-surface-2",
        saved ? "text-accent" : "text-muted hover:text-ink",
        className,
      )}
    >
      <Bookmark className={cn("size-4 transition-transform", saved && "fill-current")} strokeWidth={1.8} />
      {withLabel && <span>{saved ? t.common.saved : t.common.save}</span>}
    </button>
  );
}

/** Link to the original publication. Counts towards the Source Seeker achievement. */
export function OriginalLink({ article, variant = "inline", className }: { article: Pick<Article, "url" | "isDemo">; variant?: "inline" | "button"; className?: string }) {
  const { t } = useI18n();
  if (article.isDemo || !article.url) {
    return variant === "button" ? (
      <span className={cn("inline-flex h-11 items-center rounded-full border border-dashed border-line-strong px-5 text-[13px] text-muted", className)}>{t.common.noSource}</span>
    ) : null;
  }
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.stopPropagation();
        actions.recordSourceOpened();
      }}
      className={cn(
        variant === "button"
          ? "inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-bg transition-colors hover:bg-ink/90"
          : "inline-flex items-center gap-0.5 text-[12.5px] font-medium text-ink-2 underline-offset-4 hover:text-accent hover:underline",
        className,
      )}
    >
      {t.common.readOriginal}
      <ArrowUpRight className={variant === "button" ? "size-4" : "size-3.5"} />
    </a>
  );
}
