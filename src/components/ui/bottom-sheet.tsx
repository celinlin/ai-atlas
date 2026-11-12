"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Swipeable bottom sheet for mobile. Snap points are fractions of the viewport
 * height. Drag the handle/header to resize; a downward fling below the lowest
 * snap point dismisses. The body scrolls independently.
 */
export function BottomSheet({
  open,
  onClose,
  snaps = [0.42, 0.9],
  initialSnap = 0,
  bottomOffset = 60,
  label,
  header,
  children,
}: {
  open: boolean;
  onClose: () => void;
  snaps?: number[];
  initialSnap?: number;
  bottomOffset?: number;
  label: string;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [snap, setSnap] = useState(initialSnap);
  const [drag, setDrag] = useState<number | null>(null); // current height in px while dragging
  const start = useRef<{ y: number; h: number; t: number } | null>(null);
  const [vh, setVh] = useState(800);

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSnap(initialSnap);
  }

  const heightFor = useCallback((i: number) => Math.round(vh * snaps[i]) - bottomOffset, [vh, snaps, bottomOffset]);
  const height = drag ?? heightFor(snap);

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { y: e.clientY, h: heightFor(snap), t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const h = start.current.h + (start.current.y - e.clientY);
    setDrag(Math.max(80, Math.min(vh - 40, h)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    const velocity = dy / Math.max(1, performance.now() - start.current.t); // px/ms, + = downwards
    const h = drag ?? start.current.h;
    start.current = null;
    setDrag(null);
    if (Math.abs(dy) < 6) {
      // tap on handle toggles between snaps
      setSnap((s) => (s + 1) % snaps.length);
      return;
    }
    if ((velocity > 0.9 && snap === 0) || h < heightFor(0) * 0.6) return onClose();
    if (velocity > 0.6) return setSnap(Math.max(0, snap - 1));
    if (velocity < -0.6) return setSnap(Math.min(snaps.length - 1, snap + 1));
    let best = 0;
    snaps.forEach((_, i) => {
      if (Math.abs(heightFor(i) - h) < Math.abs(heightFor(best) - h)) best = i;
    });
    setSnap(best);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label={label}
      aria-hidden={!open}
      className={cn(
        "fixed inset-x-0 z-30 flex flex-col overflow-hidden rounded-t-[20px] border-t border-line bg-surface shadow-panel md:hidden",
        drag == null && "transition-[height,transform] duration-300 ease-out-soft",
        !open && "pointer-events-none translate-y-full",
      )}
      style={{ bottom: bottomOffset, height: open ? height : 0 }}
    >
      <div
        className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="mx-auto mb-1 mt-2 h-1 w-9 rounded-full bg-line-strong" aria-hidden />
        {header}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
