export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="16" cy="16" rx="5.5" ry="13" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      <path d="M3.5 12h25M3.5 20h25" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      <circle cx="21.5" cy="11" r="3" fill="var(--accent)" />
    </svg>
  );
}
