"use client";
import { useRouter } from "next/navigation";
import type { CountryActivity } from "@/lib/types";
import { WorldMap } from "./world-map";

export function IndustryMap({ activity, industry }: { activity: CountryActivity[]; industry: string }) {
  const router = useRouter();
  return <WorldMap activity={activity} projection="mercator" cooperative onSelect={(c) => c && router.push(`/country/${c}?industry=${industry}`)} className="h-full w-full" />;
}
