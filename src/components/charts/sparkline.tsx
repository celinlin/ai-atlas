import { cn } from "@/lib/utils";

/** Minimal bar sparkline (accessible via an sr-only summary). */
export function Sparkline({ values, className, label, highlightLast = true }: { values: number[]; className?: string; label?: string; highlightLast?: boolean }) {
  const max = Math.max(1, ...values);
  return (
    <div className={cn("flex h-10 items-end gap-[2px]", className)} role="img" aria-label={label}>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn("min-h-[2px] flex-1 rounded-[1.5px] transition-[height] duration-500", v === 0 ? "bg-line" : highlightLast && i === values.length - 1 ? "bg-accent" : "bg-accent/45")}
          style={{ height: `${Math.max(5, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function BarList({ items, onSelect, activeKey }: { items: { key: string; label: string; value: number }[]; onSelect?: (key: string) => void; activeKey?: string | null }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-1">
      {items.map((i) => {
        const inner = (
          <>
            <span className="absolute inset-y-0 left-0 rounded-md bg-accent-soft transition-[width] duration-500" style={{ width: `${(i.value / max) * 100}%` }} />
            <span className="relative truncate">{i.label}</span>
            <span className="relative ml-auto pl-3 text-muted tabular">{i.value}</span>
          </>
        );
        const cls = cn("relative flex h-8 w-full items-center overflow-hidden rounded-md px-2.5 text-left text-[13px] text-ink", activeKey === i.key && "ring-1 ring-accent");
        return (
          <li key={i.key}>
            {onSelect ? (
              <button type="button" className={cn(cls, "hover:bg-surface-2")} onClick={() => onSelect(i.key)} aria-pressed={activeKey === i.key}>{inner}</button>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
