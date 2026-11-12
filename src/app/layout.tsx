import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { BottomNav, TopNav } from "@/components/layout/nav";
import { DemoBanner } from "@/components/layout/demo-banner";
import { Providers } from "@/components/layout/providers";
import { getDictionary } from "@/lib/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: { default: `${t.brand.name} — ${t.brand.tagline}`, template: `%s · ${t.brand.name}` },
    description: t.home.heroLead,
    applicationName: t.brand.name,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f13" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getDictionary();
  return (
    <html lang={locale} suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <Providers locale={locale}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">
            Skip to content
          </a>
          <TopNav />
          <DemoBanner />
          <main id="main">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
