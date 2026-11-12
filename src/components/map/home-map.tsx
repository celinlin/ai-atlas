"use client";
import { useRouter } from "next/navigation";
import type { CountryActivity } from "@/lib/types";
import { WorldMap } from "./world-map";

export function HomeMap({ activity }: { activity: CountryActivity[] }) {
  const router = useRouter();
  return <WorldMap activity={activity} cooperative onSelect={(code) => code && router.push(`/explore?c=${code}`)} className="h-full w-full" />;
}
