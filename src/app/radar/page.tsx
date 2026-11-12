import type { Metadata } from "next";
import { FooterNav } from "@/components/layout/nav";
import { RadarView } from "@/components/radar/radar-view";
import { Container } from "@/components/ui/section";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.radar.title };
}

export default async function RadarPage() {
  const { t } = await getDictionary();
  return (
    <>
      <Container className="max-w-[1080px] pt-10 md:pt-14">
        <header className="mb-8">
          <h1 className="font-display text-[40px] leading-none text-ink md:text-[52px]">{t.radar.title}</h1>
          <p className="mt-3 max-w-xl text-[15px] text-ink-2">{t.radar.subtitle}</p>
        </header>
        <RadarView />
      </Container>
      <FooterNav />
    </>
  );
}
