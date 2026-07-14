/**
 * Deterministic normalization: dedup hashing + keyword extraction. No LLM.
 */
import { createHash } from "node:crypto";

const STOP = new Set([
  "the","a","an","and","or","for","to","of","in","on","with","how","why","what","is","are","was",
  "your","you","this","that","from","have","has","not","new","get","using","use","via","it","its",
  "should","would","could","can","will","all","any","some","most","more","than","then","they","them",
  "their","been","into","out","about","after","before","over","our","was","were","one","two","years",
  "year","day","days","just","like","make","made","data","app","apps","web","code","show","hn","ask",
  "de","la","el","los","las","un","una","y","o","para","con","por","que","del","al","en","se","su",
]);

/** Stable dedup key per (platform, url|title). */
export function contentHash(platform: string, url: string | null | undefined, title: string): string {
  const basis = (url || title).toLowerCase().trim();
  return createHash("sha1").update(`${platform}|${basis}`).digest("hex");
}

/** Significant lowercase tokens from a title (+ optional body). */
export function extractKeywords(title: string, extra?: string | null): string[] {
  const text = `${title} ${extra ?? ""}`.toLowerCase();
  const toks = text
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && w.length <= 24 && !STOP.has(w) && !/^\d+$/.test(w));
  return [...new Set(toks)].slice(0, 12);
}

/**
 * Niche gate — keep only signals about the AI / Claude / agents / automation /
 * software space (what Juko sells around). Word-boundary matched to avoid false
 * positives like "email" → "ai". A safety net on top of niche-queried sources.
 */
const NICHE_RE =
  /\b(claude|anthropic|openai|chatgpt|gpt-?\d?|gemini|mistral|llama|llm|llms|a\.?i|agi|agent|agents|agentic|automation|automat\w*|saas|software|no-?code|low-?code|chatbot|copilot|machine learning|ml|rag|workflow|workflows|n8n|zapier|make\.com|langchain|genai|prompt\w*|neural|developer|dev tools?|coding|sdk|api)\b/i;

export function isNiche(title: string | null | undefined): boolean {
  return NICHE_RE.test(title ?? "");
}

/** kebab-case slug from a phrase (trend identity). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "trend";
}
