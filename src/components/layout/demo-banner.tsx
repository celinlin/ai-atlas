import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { repo } from "@/lib/data";

export async function DemoBanner() {
  const [{ t }, status] = await Promise.all([getDictionary(), repo().status()]);
  if (!status.demo) return null;
  return (
    <div role="note" className="border-b border-line bg-warning-soft text-warning">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2 text-[12.5px] md:px-8">
        <span className="inline-flex shrink-0 items-center rounded-full border border-current/30 px-1.5 text-[10px] font-semibold uppercase tracking-wider">Demo</span>
        <p className="min-w-0 flex-1 leading-snug">{t.demo.banner}</p>
        <Link href="/admin" className="hidden shrink-0 font-medium underline-offset-2 hover:underline sm:inline">{t.demo.bannerCta}</Link>
      </div>
    </div>
  );
}
