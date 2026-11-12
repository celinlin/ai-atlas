import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreView } from "@/components/map/explore-view";
import { repo } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.explore };
}

export default async function ExplorePage() {
  const activity = await repo().countryActivity({ range: "30d" });
  return (
    <Suspense>
      <ExploreView initialActivity={activity} initialRange="30d" />
    </Suspense>
  );
}
