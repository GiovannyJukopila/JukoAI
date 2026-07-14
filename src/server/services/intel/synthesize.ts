/**
 * Trend synthesis pipeline (Pipeline A). Clusters recent raw_signals into trends,
 * attaches evidence, and computes deterministic scores.
 *
 * Two strategies:
 *   - useAi:true  → the trend_synthesis agent (claude -p) clusters + names trends.
 *   - useAi:false → deterministic keyword clustering (fast, always available).
 * Either way, Evidence-Guard drops any cluster citing a signal id we didn't provide,
 * so a trend can never reference evidence that doesn't exist.
 */
import { desc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { rawSignals, trends, trendEvidence, trendScores, trendObservations } from "@/server/db/schema";
import { slugify } from "./normalize";
import { scoreTrend, observationOf, type SignalForScore } from "./scoring/trendScores";
import { startJob, finishJob, runIntelTracked } from "./jobs";
import { trendSynthesisAgent } from "@/server/services/ai/agents/intel/trendSynthesis";

type SignalRow = typeof rawSignals.$inferSelect;
type Cluster = { title: string; summary: string | null; category: string | null; signalIds: number[] };

export type SynthesizeResult = {
  jobId: number;
  strategy: "ai" | "deterministic";
  signals: number;
  trends: number;
};

/**
 * Deterministic clustering: group signals that share a significant keyword, and
 * title each cluster with its highest-engagement signal's real headline (not the
 * bare keyword) so trends read like topics, not tokens.
 */
function clusterByKeyword(signals: SignalRow[]): Cluster[] {
  const byId = new Map(signals.map((s) => [s.id, s]));
  const engagement = (id: number) => {
    const m = byId.get(id)?.metrics ?? {};
    return (m.points ?? 0) + (m.comments ?? 0) * 2;
  };
  const byKeyword = new Map<string, number[]>();
  for (const s of signals) {
    for (const k of s.keywords ?? []) {
      if (!byKeyword.has(k)) byKeyword.set(k, []);
      byKeyword.get(k)!.push(s.id);
    }
  }
  const clusters: Cluster[] = [];
  const used = new Set<number>();
  const multi = [...byKeyword.entries()]
    .filter(([, ids]) => ids.length >= 2)
    .map(([keyword, ids]) => ({ keyword, ids, score: ids.reduce((s, i) => s + engagement(i), 0) }))
    .sort((a, b) => b.score - a.score);

  for (const { ids } of multi) {
    const fresh = ids.filter((i) => !used.has(i));
    if (fresh.length < 2) continue; // require corroboration
    fresh.forEach((i) => used.add(i));
    const lead = fresh.slice().sort((a, b) => engagement(b) - engagement(a))[0];
    const title = (byId.get(lead)?.title ?? "Trend").slice(0, 90);
    clusters.push({ title, summary: null, category: null, signalIds: fresh });
    if (clusters.length >= 8) break;
  }
  // Strong lone signals become their own emerging trend.
  const leftover = signals
    .filter((s) => !used.has(s.id))
    .sort((a, b) => engagement(b.id) - engagement(a.id))
    .slice(0, Math.max(0, 6 - clusters.length));
  for (const s of leftover) clusters.push({ title: (s.title ?? "Signal").slice(0, 90), summary: null, category: null, signalIds: [s.id] });
  return clusters;
}

async function persistCluster(c: Cluster, signalById: Map<number, SignalRow>) {
  // Evidence-Guard: only keep signal ids we actually collected.
  const validIds = c.signalIds.filter((id) => signalById.has(id));
  if (validIds.length === 0) return false;
  const sigs = validIds.map((id) => signalById.get(id)!);

  const slug = slugify(c.title);
  const platforms = [...new Set(sigs.map((s) => s.platform))];
  const now = new Date();

  const [trend] = await db
    .insert(trends)
    .values({
      slug,
      title: c.title,
      summary: c.summary,
      category: c.category,
      platforms,
      lang: sigs[0]?.lang ?? null,
      status: "emerging",
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({ target: trends.slug, set: { lastSeenAt: now, platforms, title: c.title } })
    .returning();

  for (const id of validIds) {
    await db
      .insert(trendEvidence)
      .values({ trendId: trend.id, rawSignalId: id, weight: 1 })
      .onConflictDoNothing({ target: [trendEvidence.trendId, trendEvidence.rawSignalId] });
  }

  const forScore: SignalForScore[] = sigs.map((s) => ({
    platform: s.platform,
    metrics: s.metrics,
    observedAt: s.observedAt,
    fetchedAt: s.fetchedAt,
  }));
  const scores = scoreTrend(forScore);
  await db.insert(trendScores).values({ trendId: trend.id, method: "v1", ...scores });
  const obs = observationOf(forScore);
  await db.insert(trendObservations).values({ trendId: trend.id, ...obs });
  return true;
}

export async function runSynthesize(opts: { useAi?: boolean; window?: number } = {}): Promise<SynthesizeResult> {
  const window = opts.window ?? 140;
  const job = await startJob("synthesize");

  const signals = await db.select().from(rawSignals).orderBy(desc(rawSignals.fetchedAt)).limit(window);
  const signalById = new Map(signals.map((s) => [s.id, s]));

  let clusters: Cluster[] = [];
  let strategy: "ai" | "deterministic" = "deterministic";

  if (opts.useAi && signals.length > 0) {
    const res = await runIntelTracked(
      trendSynthesisAgent,
      { signals: signals.map((s) => ({ id: s.id, platform: s.platform, title: s.title ?? "", points: s.metrics?.points, comments: s.metrics?.comments })) },
      job.id,
    );
    if (res && res.data.titles.length > 0) {
      // Reconstruct clusters from the index-aligned flat arrays.
      const { titles, summaries, categories, signalIds } = res.data;
      const built: Cluster[] = titles.map((title, i) => ({
        title: (title ?? "").slice(0, 90) || "Trend",
        summary: summaries[i]?.trim() || null,
        category: categories[i]?.trim() || null,
        signalIds: (signalIds[i] ?? "").split(/[^0-9]+/).filter(Boolean).map(Number),
      }));
      const usable = built.filter((c) => c.signalIds.length > 0);
      if (usable.length > 0) {
        strategy = "ai";
        clusters = usable;
      }
    }
  }

  // Fallback (or default) — deterministic clustering guarantees a visible result.
  if (clusters.length === 0) {
    strategy = "deterministic";
    clusters = clusterByKeyword(signals);
  }

  let saved = 0;
  for (const c of clusters) {
    if (await persistCluster(c, signalById)) saved++;
  }

  await finishJob(job.id, "completada", { signals: signals.length, trends: saved, ai: strategy === "ai" ? 1 : 0 });
  return { jobId: job.id, strategy, signals: signals.length, trends: saved };
}

/** Re-evidence signal ids that survived guarding — exported for tests/inspection. */
export { clusterByKeyword };
