import type { Metadata } from "next";
import { FooterNav } from "@/components/layout/nav";
import { SavedList } from "@/components/profile/saved-list";
import { Container } from "@/components/ui/section";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.saved.title };
}

export default async function SavedPage() {
  const { t } = await getDictionary();
  return (
    <>
      <Container className="max-w-[880px] pt-10 md:pt-14">
        <header className="mb-8">
          <h1 className="font-display text-[40px] leading-none text-ink md:text-[52px]">{t.saved.title}</h1>
          <p className="mt-3 text-[15px] text-ink-2">{t.saved.subtitle}</p>
        </header>
        <SavedList />
      </Container>
      <FooterNav />
    </>
  );
}
