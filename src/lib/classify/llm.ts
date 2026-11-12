import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CONTENT_TYPES, INDUSTRIES } from "@/lib/taxonomy";
import { countryByCode } from "@/lib/geo/countries";
import type { ArticleCountry, ContentType, IndustrySlug } from "@/lib/types";

/**
 * Optional LLM enrichment (summary + classification review), enabled when
 * ANTHROPIC_API_KEY is set. The model only sees the publisher's own title and
 * description and is instructed not to add facts. Output is validated against
 * our taxonomy; anything invalid is discarded and the rules result is kept.
 */

const Enrichment = z.object({
  summary: z.string().describe("1-2 sentence factual summary using only facts present in the input"),
  is_ai_related: z.boolean(),
  event_countries: z.array(z.string()).describe("ISO 3166-1 alpha-2 codes where the AI development takes place; empty for global stories"),
  industries: z.array(z.string()),
  content_type: z.string(),
});
export type EnrichmentResult = {
  summary: string;
  isAiRelated: boolean;
  eventCountries: ArticleCountry[];
  industries: IndustrySlug[];
  contentType: ContentType | null;
};

let client: Anthropic | null = null;
export function llmEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && process.env.LLM_ENRICHMENT !== "off";
}

const SYSTEM = `You classify and summarize AI news for a geographic news atlas.
Rules:
- Use ONLY information in the provided title and description. Never add facts, numbers, names, quotes or dates.
- event_countries: countries where the AI development itself happens (deployment, company HQ for funding news, regulator's jurisdiction). Never infer location from the publisher or its domain. Use [] if unclear or global.
- industries: choose 1-3 from: ${INDUSTRIES.map((i) => i.slug).join(", ")}. Use "general" for cross-industry stories.
- content_type: exactly one of: ${CONTENT_TYPES.map((t) => t.slug).join(", ")}.
- summary: neutral, factual, at most 45 words, in the article's language.`;

export async function enrichWithLlm(input: { title: string; description: string; publisher: string }): Promise<EnrichmentResult | null> {
  if (!llmEnabled()) return null;
  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: process.env.LLM_MODEL || "claude-opus-5-5",
      max_tokens: 2048,
      // Classification is a high-volume, simple task: low effort keeps cost and latency down.
      output_config: { effort: "low", format: betaZodOutputFormat(Enrichment) },
      // On a safety decline, the API re-runs the request on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Publisher: ${input.publisher}\nTitle: ${input.title}\nDescription: ${input.description.slice(0, 2500)}`,
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return null;
    const out = response.parsed_output;
    return {
      summary: out.summary.trim(),
      isAiRelated: out.is_ai_related,
      eventCountries: out.event_countries
        .map((c) => c.toUpperCase())
        .filter((c) => countryByCode.has(c))
        .slice(0, 4)
        .map((code) => ({ code, role: "event" as const, confidence: 0.85 })),
      industries: out.industries.filter((i): i is IndustrySlug => INDUSTRIES.some((d) => d.slug === i)).slice(0, 3),
      contentType: (CONTENT_TYPES.find((t) => t.slug === out.content_type)?.slug ?? null) as ContentType | null,
    };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) console.warn("[llm] rate limited; using rules only");
    else if (error instanceof Anthropic.APIError) console.warn(`[llm] API error ${error.status}: ${error.message}`);
    else console.warn("[llm] enrichment failed", error);
    return null;
  }
}
