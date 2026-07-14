/**
 * Hacker News collector (free, keyless JSON via Algolia). Queried on the AI / Claude
 * / agents / automation niche instead of the generic front page, so signals carry
 * real engagement metrics (points, comments) on the topics Juko sells around.
 */
import { fetchJson } from "@/server/lib/http";
import type { Source, RawSignalInput } from "./types";

type Hit = {
  objectID: string;
  title: string | null;
  url: string | null;
  points: number | null;
  num_comments: number | null;
  author: string | null;
  created_at: string | null;
};

const QUERIES = ["Claude", "AI agent", "LLM", "AI automation", "Anthropic", "AI SaaS"];

export const hackerNewsSource: Source = {
  platform: "hacker_news",
  kind: "forum",
  label: "Hacker News · IA & Dev",
  requiresKey: false,
  async fetch(ctx): Promise<RawSignalInput[]> {
    const per = Math.max(3, Math.floor(ctx.limit / QUERIES.length));
    const seen = new Set<string>();
    const out: RawSignalInput[] = [];
    for (const q of QUERIES) {
      let data;
      try {
        data = await fetchJson<{ hits: Hit[] }>(
          `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=${per}`,
          { provider: "hacker_news", timeoutMs: 12000, retries: 2 },
        );
      } catch {
        continue; // isolate per-query failures
      }
      for (const h of data.hits ?? []) {
        if (!h.title || seen.has(h.objectID)) continue;
        seen.add(h.objectID);
        out.push({
          externalId: h.objectID,
          url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
          title: h.title,
          author: h.author ?? null,
          lang: "en",
          metrics: { points: h.points ?? 0, comments: h.num_comments ?? 0 },
          observedAt: h.created_at ? new Date(h.created_at) : null,
          raw: h,
        });
      }
    }
    return out;
  },
};
