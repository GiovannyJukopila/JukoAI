/**
 * Source registry. Free niche sources (Hacker News, Google News) are live and
 * self-enable. The social networks Juko posts on (Instagram, TikTok, YouTube,
 * Facebook) are registered as placeholders that require an API key for native
 * trend data — visible in the sources view, disabled until connected.
 */
import { db } from "@/server/db/client";
import { contentSources } from "@/server/db/schema";
import type { Source } from "./types";
import { hackerNewsSource } from "./hackerNews";
import { googleNewsSource } from "./googleNews";

/** Collectors with a real fetch implementation. */
export const ALL_SOURCES: Source[] = [hackerNewsSource, googleNewsSource];

/** Networks we want native trends from but which need an authenticated API (kept disabled). */
const PLACEHOLDER_SOURCES: { platform: string; kind: string; label: string }[] = [
  { platform: "instagram", kind: "social", label: "Instagram · Reels (requiere API)" },
  { platform: "tiktok", kind: "social", label: "TikTok · Creative Center (requiere API)" },
  { platform: "youtube", kind: "social", label: "YouTube · Data API (requiere API)" },
  { platform: "facebook", kind: "social", label: "Facebook · Graph API (requiere API)" },
];

/** Idempotently register every source (real + placeholder) as a content_sources row. */
export async function ensureSources(): Promise<void> {
  for (const s of ALL_SOURCES) {
    await db
      .insert(contentSources)
      .values({ platform: s.platform, kind: s.kind, label: s.label, enabled: !s.requiresKey, requiresKey: s.requiresKey })
      .onConflictDoNothing({ target: [contentSources.platform, contentSources.label] });
  }
  for (const p of PLACEHOLDER_SOURCES) {
    await db
      .insert(contentSources)
      .values({ platform: p.platform, kind: p.kind, label: p.label, enabled: false, requiresKey: true })
      .onConflictDoNothing({ target: [contentSources.platform, contentSources.label] });
  }
}

/** Enabled collectors paired with their DB row (only those with a real implementation). */
export async function enabledSources(): Promise<{ row: typeof contentSources.$inferSelect; source: Source }[]> {
  await ensureSources();
  const rows = await db.select().from(contentSources);
  const out: { row: typeof contentSources.$inferSelect; source: Source }[] = [];
  for (const row of rows) {
    const source = ALL_SOURCES.find((s) => s.platform === row.platform && s.label === row.label);
    if (source && row.enabled) out.push({ row, source });
  }
  return out;
}
