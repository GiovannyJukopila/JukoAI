/** Minimal RSS/Atom item parser using cheerio (already a project dependency). */
import { load } from "cheerio";
import { fetchText } from "@/server/lib/http";

export type RssItem = { title: string; link: string | null; pubDate: string | null; source: string | null };

export async function fetchRss(url: string, provider: string): Promise<RssItem[]> {
  const res = await fetchText(url, { provider, timeoutMs: 12000, retries: 2 });
  if (!res.ok || !res.body) return [];
  const $ = load(res.body, { xmlMode: true });
  const items: RssItem[] = [];
  $("item, entry").each((_, el) => {
    const node = $(el);
    const title = node.find("title").first().text().trim();
    // RSS uses <link>text</link>; Atom uses <link href="…"/>.
    const link = node.find("link").first().text().trim() || node.find("link").first().attr("href") || null;
    const pubDate = (node.find("pubDate").first().text() || node.find("updated").first().text() || node.find("published").first().text()).trim() || null;
    const source = node.find("source").first().text().trim() || null;
    if (title) items.push({ title, link, pubDate, source });
  });
  return items;
}
