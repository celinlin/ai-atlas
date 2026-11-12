import { CONTENT_TYPES, INDUSTRIES, TOPICS } from "@/lib/taxonomy";
import type { ContentType, IndustrySlug } from "@/lib/types";
import { escapeRegex } from "./text";

function keywordRegex(kw: string): RegExp {
  const k = escapeRegex(kw.trim());
  // Short keywords need both boundaries ("app" ≠ "apple"); longer ones are stems ("regulat" → "regulation").
  const end = kw.trim().length < 5 ? "(?![\\p{L}\\p{N}])" : "";
  return new RegExp(`(?<![\\p{L}\\p{N}])${k}${end}`, "giu");
}

const cache = new Map<string, RegExp>();
function count(text: string, kw: string): number {
  let re = cache.get(kw);
  if (!re) {
    re = keywordRegex(kw);
    cache.set(kw, re);
  }
  re.lastIndex = 0;
  return text.match(re)?.length ?? 0;
}

function score(title: string, body: string, keywords: string[]): { score: number; hits: string[] } {
  const t = title.toLowerCase();
  const b = body.toLowerCase();
  let s = 0;
  const hits: string[] = [];
  for (const kw of keywords) {
    const th = count(t, kw);
    const bh = Math.min(count(b, kw), 3);
    if (th || bh) {
      s += th * 2 + bh;
      hits.push(kw.trim());
    }
  }
  return { score: s, hits };
}

const AI_TERMS = [
  "artificial intelligence", "ai", "a.i.", "machine learning", "deep learning", "neural network", "llm", "llms", "large language model",
  "generative", "genai", "chatbot", "chatgpt", "gpt", "claude", "gemini", "copilot", "llama", "mistral", "deepseek", "foundation model",
  "intelligence artificielle", "ia", "apprentissage automatique", "computer vision", "robotaxi", "humanoid", "agentic", "ai agent", "openai",
  "anthropic", "deepmind", "hugging face", "nvidia", "transformer model", "diffusion model", "reinforcement learning", "inference",
  "language model", "multimodal model", "open-weight", "ai model", "ai-powered", "ai-driven", "modèle de langage", "algorithm",
];

/** True when the text is actually about AI (feeds often mix in other tech news). */
export function isAiRelated(title: string, body: string): boolean {
  const text = `${title} ${body}`;
  return AI_TERMS.some((kw) => {
    if (kw === "ai" || kw === "ia") return /(?<![\p{L}\p{N}])(AI|IA)(?![\p{L}\p{N}])/u.test(text);
    return count(text.toLowerCase(), kw) > 0;
  });
}

export function classifyIndustries(title: string, body: string): { industries: IndustrySlug[]; trace: string[] } {
  const ranked = INDUSTRIES.filter((i) => i.keywords.length)
    .map((i) => ({ slug: i.slug, ...score(title, body, i.keywords) }))
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return { industries: ["general"], trace: ["No sector-specific signals — cross-industry"] };
  const top = ranked[0].score;
  const chosen = ranked.filter((r) => r.score >= Math.max(2, top * 0.5)).slice(0, 3);
  return {
    industries: chosen.map((r) => r.slug),
    trace: chosen.map((r) => `${r.slug}: ${r.hits.slice(0, 4).join(", ")}`),
  };
}

const WEAK_TYPE_KEYWORDS = new Set(["million", "billion", "model", "app", "update", "feature", "first", "university", "act "]);

export function classifyContentType(title: string, body: string): { type: ContentType; trace: string[] } {
  const ranked = CONTENT_TYPES.map((t, order) => {
    let s = 0;
    const hits: string[] = [];
    for (const kw of t.keywords) {
      const r = score(title, body, [kw]);
      if (r.score) {
        s += r.score * (WEAK_TYPE_KEYWORDS.has(kw) ? 0.4 : 1);
        hits.push(kw.trim());
      }
    }
    return { slug: t.slug, score: s, hits, order };
  }).sort((a, b) => b.score - a.score || a.order - b.order);
  const best = ranked[0];
  if (!best || best.score < 1) return { type: "innovation", trace: ["No strong type signals — defaulted to innovation"] };
  return { type: best.slug, trace: [`${best.slug}: ${best.hits.slice(0, 4).join(", ")}`] };
}

export function classifyTopics(title: string, body: string): string[] {
  return TOPICS.map((t) => ({ slug: t.slug, ...score(title, body, t.keywords) }))
    .filter((r) => r.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((r) => r.slug);
}

// Well-known organisations. Matching is case-sensitive on the canonical name.
const KNOWN_ORGS = [
  "OpenAI", "Anthropic", "Google DeepMind", "DeepMind", "Google", "Microsoft", "Meta", "Nvidia", "NVIDIA", "Apple", "Amazon", "AWS", "IBM", "Intel", "AMD", "Qualcomm",
  "TSMC", "Samsung", "SK Hynix", "Arm", "Mistral AI", "Hugging Face", "Cohere", "xAI", "Perplexity", "Stability AI", "Runway", "Midjourney", "Scale AI", "Databricks",
  "Snowflake", "Salesforce", "Oracle", "Baidu", "Alibaba", "Tencent", "ByteDance", "Huawei", "DeepSeek", "Moonshot AI", "Zhipu", "iFlytek", "SenseTime", "Xiaomi",
  "Naver", "Kakao", "LG AI Research", "Sony", "SoftBank", "Sakana AI", "Preferred Networks", "Rakuten", "Infosys", "Tata Consultancy Services", "Wipro", "Reliance",
  "Sarvam AI", "Krutrim", "G42", "Aleph Alpha", "Helsing", "Synthesia", "Graphcore", "Poolside", "Black Forest Labs", "Lovable", "ElevenLabs", "Tesla", "Waymo",
  "Baidu Apollo", "Pony.ai", "WeRide", "Wayve", "Figure AI", "Boston Dynamics", "Unitree", "UNESCO", "OECD", "United Nations", "European Commission", "European Parliament",
  "World Health Organization", "WHO", "World Bank", "IMF", "NIST", "Ofcom", "CNIL", "AI Safety Institute", "AI Security Institute", "Inria", "Mila", "Vector Institute",
  "Stanford", "MIT", "Carnegie Mellon", "Oxford", "Cambridge", "ETH Zurich", "EPFL", "Tsinghua", "KAIST", "Andela", "Jumia", "Safaricom", "MTN", "Nubank", "Mercado Libre",
  "Grab", "Gojek", "Sea Limited", "Shopify", "Spotify", "ASML", "Siemens", "SAP", "Bosch", "Schneider Electric", "Airbus", "Thales", "Dassault Systèmes", "Capgemini",
  "Orange", "BNP Paribas", "AXA", "Ericsson", "Nokia", "Accenture", "Deloitte", "McKinsey", "Goldman Sachs", "JPMorgan", "HSBC", "Visa", "Mastercard",
];
const ORG_RES = KNOWN_ORGS.map((o) => ({ name: o === "NVIDIA" ? "Nvidia" : o, re: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(o)}(?![\\p{L}\\p{N}])`, "u") }));

// "Acme Robotics", "Nordlicht Health Labs", "Kestrel AI", "Ministry of Digital Economy"
const ORG_SUFFIX = /\b((?:[A-Z][\w&.-]+\s){0,3}(?:[A-Z][\w&.-]+)\s(?:AI|Labs?|Technologies|Robotics|Systems|Health|Bank|Group|Inc\.?|Ltd\.?|GmbH|SAS|Institute|University|Capital|Ventures|Networks|Analytics|Intelligence))\b/g;
const MINISTRY = /\b(Ministry of [A-Z][\w]*(?:\s(?:and|of|&)?\s?[A-Z][\w]*){0,4})/g;
const ORG_STOP = new Set(["The", "A", "An", "How", "Why", "What", "When", "This", "New", "Its", "Our", "In", "On", "At", "For", "With", "From", "As", "By"]);

export function extractOrganizations(title: string, body: string): string[] {
  const text = `${title}. ${body}`;
  const found = new Map<string, number>();
  for (const { name, re } of ORG_RES) if (re.test(text)) found.set(name, (found.get(name) ?? 0) + (re.test(title) ? 2 : 1));
  for (const re of [ORG_SUFFIX, MINISTRY]) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const words = m[1].trim().split(/\s+/);
      while (words.length && ORG_STOP.has(words[0])) words.shift();
      const name = words.join(" ");
      if (words.length >= 2 && name.length <= 60 && ![...found.keys()].some((k) => k.includes(name) || name.includes(k))) found.set(name, (found.get(name) ?? 0) + 1);
    }
  }
  // "Google DeepMind" supersedes "Google" and "DeepMind".
  if (found.has("Google DeepMind")) {
    found.delete("DeepMind");
    found.delete("Google");
  }
  return [...found.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);
}

/** Heuristic 0..1 quality score: richness, headline hygiene, source prior. */
export function qualityScore(input: { title: string; body: string; sourceReliability: number; hasImage: boolean }): number {
  let q = 0.35 * input.sourceReliability;
  const len = input.body.length;
  q += len > 400 ? 0.25 : len > 160 ? 0.18 : len > 60 ? 0.08 : 0;
  const tl = input.title.length;
  q += tl >= 30 && tl <= 140 ? 0.15 : 0.05;
  if (!/[!?]{2,}|you won't believe|shocking|\bthis one\b/i.test(input.title)) q += 0.1;
  if (input.title !== input.title.toUpperCase()) q += 0.05;
  if (input.hasImage) q += 0.05;
  if (/\b(sponsored|advertorial|press release distribution)\b/i.test(input.body)) q -= 0.2;
  return Math.max(0, Math.min(1, Math.round(q * 100) / 100));
}
