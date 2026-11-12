import type { Metadata } from "next";
import { FooterNav } from "@/components/layout/nav";
import { AccountCard } from "@/components/profile/account";
import { Passport } from "@/components/profile/passport";
import { Settings } from "@/components/profile/settings";
import { Container } from "@/components/ui/section";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.profile.title };
}

export default async function ProfilePage() {
  const { t } = await getDictionary();
  return (
    <>
      <Container className="max-w-[1080px] pt-10 md:pt-14">
        <header className="mb-8">
          <p className="eyebrow">{t.profile.title}</p>
          <h1 className="font-display mt-2 text-[40px] leading-none text-ink md:text-[52px]">{t.profile.passport}</h1>
          <p className="mt-3 max-w-xl text-[15px] text-ink-2">{t.profile.passportLead}</p>
        </header>
        <Passport />
        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          <Settings />
          <AccountCard />
        </div>
      </Container>
      <FooterNav />
    </>
  );
}
