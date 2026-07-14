/**
 * Collection run: for every enabled source, fetch real items and upsert them into
 * raw_signals (deduped by content_hash). Deterministic — no LLM. Tracked in intel_jobs.
 */
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { rawSignals, contentSources } from "@/server/db/schema";
import { enabledSources } from "./sources/registry";
import { contentHash, extractKeywords, isNiche } from "./normalize";
import { startJob, finishJob } from "./jobs";

export type CollectResult = { jobId: number; sources: number; fetched: number; inserted: number; skipped: number };

export async function runCollect(opts: { limitPerSource?: number } = {}): Promise<CollectResult> {
  const limit = opts.limitPerSource ?? 60;
  const job = await startJob("collect");
  const sources = await enabledSources();
  let fetched = 0;
  let inserted = 0;
  let skipped = 0;

  for (const { row, source } of sources) {
    try {
      const items = await source.fetch({ limit });
      fetched += items.length;
      for (const it of items) {
        // Niche gate: keep only AI / Claude / agents / automation / software signals.
        if (!isNiche(it.title)) {
          skipped++;
          continue;
        }
        const hash = contentHash(source.platform, it.url, it.title);
        const keywords = it.keywords ?? extractKeywords(it.title, it.body);
        const res = await db
          .insert(rawSignals)
          .values({
            sourceId: row.id,
            platform: source.platform,
            externalId: it.externalId ?? null,
            url: it.url ?? null,
            title: it.title,
            body: it.body ?? null,
            author: it.author ?? null,
            lang: it.lang ?? null,
            region: it.region ?? null,
            metrics: it.metrics ?? {},
            keywords,
            contentHash: hash,
            observedAt: it.observedAt ?? null,
            raw: (it.raw ?? null) as object | null,
          })
          .onConflictDoNothing({ target: [rawSignals.sourceId, rawSignals.contentHash] })
          .returning({ id: rawSignals.id });
        if (res.length) inserted++;
      }
      await db
        .update(contentSources)
        .set({ lastRunAt: new Date(), lastOkAt: new Date(), lastError: null })
        .where(eq(contentSources.id, row.id));
    } catch (err) {
      // Isolate per-source failures: one bad feed never aborts the whole run.
      await db
        .update(contentSources)
        .set({ lastRunAt: new Date(), lastError: (err as Error).message })
        .where(eq(contentSources.id, row.id));
    }
  }

  await finishJob(job.id, "completada", { sources: sources.length, fetched, inserted, skipped });
  return { jobId: job.id, sources: sources.length, fetched, inserted, skipped };
}
