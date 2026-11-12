import Link from "next/link";
import { Container } from "@/components/ui/section";
import { getDictionary } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getDictionary();
  return (
    <Container className="py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-display mt-3 text-5xl text-ink">{t.brand.tagline}</h1>
      <Link href="/explore" className="mt-8 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-bg">{t.home.cta}</Link>
    </Container>
  );
}
