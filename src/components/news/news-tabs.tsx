"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { NEWS_VIEWS, type NewsView } from "@/lib/news-views";
import { cn } from "@/lib/utils";


export function NewsTabs({ current }: { current: NewsView }) {
  const { t } = useI18n();
  const sp = useSearchParams();
  return (
    <nav aria-label={t.news.title} className="scrollbar-none -mx-4 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
      <ul className="flex gap-5">
        {NEWS_VIEWS.map((v) => {
          const next = new URLSearchParams(sp.toString());
          next.set("view", v);
          next.delete("limit");
          return (
            <li key={v}>
              <Link
                href={`/news?${next}`}
                scroll={false}
                aria-current={current === v ? "page" : undefined}
                className={cn("relative block whitespace-nowrap py-3 text-[14px] transition-colors", current === v ? "text-ink" : "text-muted hover:text-ink")}
              >
                {t.news.tabs[v]}
                {current === v && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
