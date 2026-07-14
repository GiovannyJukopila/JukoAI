/**
 * Google News collector (free, keyless RSS). Queried on the AI / Claude / agents /
 * automation niche — the topics Juko sells around — so it surfaces fresh news and
 * "just launched" items to turn into social content.
 */
import type { Source, RawSignalInput } from "./types";
import { fetchRss } from "./rss";

// Niche queries aimed at "sell agents / automation / software" content.
const QUERIES = [
  "Claude AI",
  "AI agents",
  "AI automation",
  "agentic AI",
  "new AI tool launch",
  "AI SaaS startup",
];

export const googleNewsSource: Source = {
  platform: "google_news",
  kind: "news",
  label: "Google News · IA & Agentes",
  requiresKey: false,
  async fetch(ctx): Promise<RawSignalInput[]> {
    const out: RawSignalInput[] = [];
    const per = Math.max(4, Math.floor(ctx.limit / QUERIES.length));
    for (const q of QUERIES) {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
      let items;
      try {
        items = await fetchRss(url, "google_news");
      } catch {
        continue; // isolate per-query failures
      }
      for (const it of items.slice(0, per)) {
        // Google News titles look like "Headline - Publisher".
        const m = it.title.match(/^(.*?)\s+-\s+([^-]+)$/);
        const headline = (m ? m[1] : it.title).trim();
        out.push({
          title: headline,
          url: it.link,
          author: it.source ?? (m ? m[2].trim() : null),
          lang: "en",
          metrics: { mentions: 1 }, // news = coverage, not engagement
          observedAt: it.pubDate ? new Date(it.pubDate) : null,
          raw: it,
        });
      }
    }
    return out;
  },
};
