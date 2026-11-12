import type { RawItem } from "@/lib/classify";

export interface ProviderResult {
  items: RawItem[];
  errors: string[];
}

export interface NewsProvider {
  id: string;
  label: string;
  /** Why the provider is (not) active, for the admin console. */
  enabled(): { enabled: boolean; reason: string };
  fetch(): Promise<ProviderResult>;
}
