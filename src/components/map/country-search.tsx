"use client";
import { Search, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { COUNTRIES } from "@/lib/geo/countries";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Accessible combobox to select any country (also the keyboard path into the map). */
export function CountrySearch({ counts, onSelect, className }: { counts: Map<string, number>; onSelect: (code: string) => void; className?: string }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const n = norm(q.trim());
    const list = COUNTRIES.filter((c) => !n || norm(c.en).includes(n) || norm(c.fr).includes(n) || c.code.toLowerCase() === n);
    return list
      .map((c) => ({ code: c.code, name: locale === "fr" ? c.fr : c.en, count: counts.get(c.code) ?? 0, starts: n ? norm(locale === "fr" ? c.fr : c.en).startsWith(n) : false }))
      .sort((a, b) => Number(b.starts) - Number(a.starts) || b.count - a.count || a.name.localeCompare(b.name, locale))
      .slice(0, 8);
  }, [q, counts, locale]);

  const choose = (code: string) => {
    onSelect(code);
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface/95 px-4 shadow-panel backdrop-blur focus-within:border-line-strong">
        <Search className="size-4 shrink-0 text-muted" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${results[active].code}` : undefined}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              choose(results[active].code);
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={t.map.searchCountry}
          aria-label={t.map.searchCountry}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
        />
        {q && (
          <button type="button" aria-label={t.common.close} onClick={() => setQ("")} className="text-muted hover:text-ink">
            <X className="size-4" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-line bg-surface py-1.5 shadow-panel">
          {results.map((r, i) => (
            <li
              key={r.code}
              id={`${listId}-${r.code}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(r.code);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center gap-3 px-4 py-2 text-[14px]", i === active ? "bg-surface-2 text-ink" : "text-ink-2")}
            >
              <span className="w-6 text-[11px] font-medium text-muted">{r.code}</span>
              <span className="flex-1 truncate">{r.name}</span>
              <span className="text-[12px] text-muted tabular">{r.count || ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
