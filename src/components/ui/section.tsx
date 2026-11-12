import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeader({ title, eyebrow, href, linkLabel, className }: { title: string; eyebrow?: string; href?: string; linkLabel?: string; className?: string }) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4 border-b border-line pb-3", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="font-display text-[22px] leading-tight text-ink md:text-2xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-[13px] text-muted transition-colors hover:text-ink">
          {linkLabel}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1280px] px-4 md:px-8", className)}>{children}</div>;
}
