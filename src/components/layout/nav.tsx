"use client";
import { Bookmark, Compass, LayoutGrid, Newspaper, Radar, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { useAtlas } from "@/lib/store/atlas-store";
import { cn } from "@/lib/utils";
import { LocaleSwitch, ThemeToggle } from "./controls";
import { LogoMark } from "./logo";

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`) || (href === "/explore" && path.startsWith("/country"));
}

export function TopNav() {
  const { t } = useI18n();
  const path = usePathname();
  const savedCount = useAtlas((s) => s.saved.length);
  const links = [
    { href: "/explore", label: t.nav.explore },
    { href: "/news", label: t.nav.news },
    { href: "/industries", label: t.nav.industries },
    { href: "/radar", label: t.nav.radar },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-6 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 text-ink" aria-label={`${t.brand.name} — ${t.nav.home}`}>
          <LogoMark className="size-[22px]" />
          <span className="text-[15px] font-semibold tracking-tight">{t.brand.name}</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(path, l.href) ? "page" : undefined}
              className={cn(
                "relative rounded-full px-3 py-1.5 text-[13.5px] transition-colors",
                isActive(path, l.href) ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {l.label}
              {isActive(path, l.href) && <span className="absolute inset-x-3 -bottom-[11px] h-px bg-ink" />}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/search"
            className="hidden h-8 w-52 items-center gap-2 rounded-full border border-line bg-surface px-3 text-[13px] text-muted transition-colors hover:border-line-strong lg:flex"
          >
            <Search className="size-3.5" />
            {t.nav.search}
          </Link>
          <Link href="/search" aria-label={t.nav.search} className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink lg:hidden">
            <Search className="size-4" />
          </Link>
          <Link href="/saved" aria-label={t.nav.saved} className="relative hidden size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink md:grid">
            <Bookmark className="size-4" />
            {savedCount > 0 && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" />}
          </Link>
          <Link href="/profile" aria-label={t.nav.profile} className="hidden size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink md:grid">
            <UserRound className="size-4" />
          </Link>
          <ThemeToggle />
          <LocaleSwitch />
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { t } = useI18n();
  const path = usePathname();
  const items = [
    { href: "/explore", label: t.nav.explore, icon: Compass },
    { href: "/news", label: t.nav.news, icon: Newspaper },
    { href: "/radar", label: t.nav.radar, icon: Radar },
    { href: "/saved", label: t.nav.saved, icon: Bookmark },
    { href: "/profile", label: t.nav.profile, icon: UserRound },
  ];
  return (
    <nav aria-label="Primary" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid h-[60px] max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex h-full flex-col items-center justify-center gap-1 text-[10.5px] transition-colors", active ? "text-ink" : "text-muted")}>
                <Icon className={cn("size-[19px] transition-transform", active && "scale-105")} strokeWidth={active ? 2.1 : 1.7} />
                <span className={cn(active && "font-medium")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function FooterNav() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-line pb-24 md:pb-0">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-2 text-ink">
          <LogoMark className="size-5" />
          <span className="font-display text-lg">{t.brand.tagline}</span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted" aria-label="Footer">
          <Link href="/explore" className="hover:text-ink">{t.nav.explore}</Link>
          <Link href="/news" className="hover:text-ink">{t.nav.news}</Link>
          <Link href="/industries" className="hover:text-ink">{t.nav.industries}</Link>
          <Link href="/search" className="hover:text-ink">{t.nav.search}</Link>
          <Link href="/admin" className="hover:text-ink">{t.nav.admin}</Link>
          <span className="inline-flex items-center gap-1"><LayoutGrid className="size-3" />Natural Earth · MapLibre</span>
        </nav>
      </div>
    </footer>
  );
}
