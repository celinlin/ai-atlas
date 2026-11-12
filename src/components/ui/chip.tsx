import * as React from "react";
import { cn } from "@/lib/utils";

export function Chip({ active, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors duration-200",
        active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Tag({ className, children, tone = "default" }: { className?: string; children: React.ReactNode; tone?: "default" | "accent" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4",
        tone === "default" && "bg-surface-2 text-ink-2",
        tone === "accent" && "bg-accent-soft text-accent-2",
        tone === "warning" && "bg-warning-soft text-warning",
        className,
      )}
    >
      {children}
    </span>
  );
}
