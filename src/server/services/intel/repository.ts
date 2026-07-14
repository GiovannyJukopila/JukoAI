/** Read models for the Content Intelligence dashboard. */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  trends,
  trendScores,
  trendEvidence,
  trendObservations,
  rawSignals,
  contentSources,
  intelJobs,
  businesses,
  contentOpportunities,
  claudeIdeas,
  type OpportunityStatus,
} from "@/server/db/schema";

export type TrendListItem = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  category: string | null;
  platforms: string[];
  status: string;
  lastSeenAt: Date;
  latestAt: string | null;
  isFresh: boolean;
  evidenceCount: number;
  momentum: number | null;
  volume: number | null;
  confidence: number | null;
  competition: number | null;
  evergreen: number | null;
  crossPlatform: number | null;
};

export async function listTrends(opts: { status?: string; limit?: number } = {}): Promise<TrendListItem[]> {
  const limit = opts.limit ?? 60;
  const rows = await db
    .select()
    .from(trends)
    .where(opts.status ? eq(trends.status, opts.status) : undefined)
    .orderBy(desc(trends.lastSeenAt))
    .limit(limit);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  // Latest score per trend (rows ordered desc → first seen wins).
  const scores = await db
    .select()
    .from(trendScores)
    .where(inArray(trendScores.trendId, ids))
    .orderBy(desc(trendScores.computedAt));
  const latestScore = new Map<number, typeof scores[number]>();
  for (const s of scores) if (!latestScore.has(s.trendId)) latestScore.set(s.trendId, s);

  const ev = await db
    .select({ trendId: trendEvidence.trendId, n: sql<number>`count(*)` })
    .from(trendEvidence)
    .where(inArray(trendEvidence.trendId, ids))
    .groupBy(trendEvidence.trendId);
  const evCount = new Map(ev.map((e) => [e.trendId, Number(e.n)]));

  // Freshness: newest evidence timestamp per trend.
  const latest = await db
    .select({
      trendId: trendEvidence.trendId,
      latest: sql<string>`max(coalesce(${rawSignals.observedAt}, ${rawSignals.fetchedAt}))`,
    })
    .from(trendEvidence)
    .innerJoin(rawSignals, eq(trendEvidence.rawSignalId, rawSignals.id))
    .where(inArray(trendEvidence.trendId, ids))
    .groupBy(trendEvidence.trendId);
  const latestMap = new Map(latest.map((l) => [l.trendId, l.latest ? new Date(l.latest).getTime() : 0]));

  return rows
    .map((r) => {
      const sc = latestScore.get(r.id);
      const lt = latestMap.get(r.id) ?? 0;
      const isFresh = lt > 0 && Date.now() - lt < 24 * 3600e3;
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        category: r.category,
        platforms: r.platforms ?? [],
        status: r.status,
        lastSeenAt: r.lastSeenAt,
        latestAt: lt > 0 ? new Date(lt).toISOString() : null,
        isFresh,
        evidenceCount: evCount.get(r.id) ?? 0,
        momentum: sc?.momentum ?? null,
        volume: sc?.volume ?? null,
        confidence: sc?.confidence ?? null,
        competition: sc?.competition ?? null,
        evergreen: sc?.evergreen ?? null,
        crossPlatform: sc?.crossPlatform ?? null,
      };
    })
    // Fresh first, then by momentum — this is a daily radar.
    .sort((a, b) => Number(b.isFresh) - Number(a.isFresh) || (b.momentum ?? 0) - (a.momentum ?? 0));
}

export async function getTrend(id: number) {
  const [trend] = await db.select().from(trends).where(eq(trends.id, id)).limit(1);
  if (!trend) return null;

  const [score] = await db
    .select()
    .from(trendScores)
    .where(eq(trendScores.trendId, id))
    .orderBy(desc(trendScores.computedAt))
    .limit(1);

  const evidence = await db
    .select({
      signalId: rawSignals.id,
      platform: rawSignals.platform,
      title: rawSignals.title,
      url: rawSignals.url,
      author: rawSignals.author,
      metrics: rawSignals.metrics,
      fetchedAt: rawSignals.fetchedAt,
      observedAt: rawSignals.observedAt,
    })
    .from(trendEvidence)
    .innerJoin(rawSignals, eq(trendEvidence.rawSignalId, rawSignals.id))
    .where(eq(trendEvidence.trendId, id))
    .orderBy(desc(rawSignals.observedAt));

  const observations = await db
    .select()
    .from(trendObservations)
    .where(eq(trendObservations.trendId, id))
    .orderBy(trendObservations.observedAt);

  const ideas = await db
    .select()
    .from(claudeIdeas)
    .where(eq(claudeIdeas.trendId, id))
    .orderBy(desc(claudeIdeas.id));

  return { trend, score: score ?? null, evidence, observations, ideas };
}

export async function trendKpis() {
  const [row] = await db
    .select({
      trends: sql<number>`count(*)`,
    })
    .from(trends);
  const [sig] = await db.select({ n: sql<number>`count(*)` }).from(rawSignals);
  const [src] = await db.select({ n: sql<number>`count(*)` }).from(contentSources).where(eq(contentSources.enabled, true));
  const fresh = await db
    .select({ n: sql<number>`count(distinct ${trendEvidence.trendId})` })
    .from(trendEvidence)
    .innerJoin(rawSignals, eq(trendEvidence.rawSignalId, rawSignals.id))
    .where(sql`coalesce(${rawSignals.observedAt}, ${rawSignals.fetchedAt}) > now() - interval '24 hours'`);
  return {
    trends: Number(row?.trends ?? 0),
    signals: Number(sig?.n ?? 0),
    sources: Number(src?.n ?? 0),
    fresh: Number(fresh[0]?.n ?? 0),
  };
}

export async function listSources() {
  return db.select().from(contentSources).orderBy(contentSources.platform, contentSources.label);
}

/** Content opportunities (Pipeline B) with business + trend labels, for the queue. */
export async function listOpportunities(opts: { businessId?: number; status?: string; limit?: number } = {}) {
  const conds = [];
  if (opts.businessId) conds.push(eq(contentOpportunities.businessId, opts.businessId));
  if (opts.status) conds.push(eq(contentOpportunities.status, opts.status));
  const rows = await db
    .select({ o: contentOpportunities, businessName: businesses.name, trendTitle: trends.title })
    .from(contentOpportunities)
    .innerJoin(businesses, eq(contentOpportunities.businessId, businesses.id))
    .leftJoin(trends, eq(contentOpportunities.trendId, trends.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(contentOpportunities.businessFit), desc(contentOpportunities.id))
    .limit(opts.limit ?? 100);
  return rows.map((r) => ({ ...r.o, businessName: r.businessName, trendTitle: r.trendTitle }));
}

export async function opportunityCountByStatus() {
  const rows = await db
    .select({ status: contentOpportunities.status, n: sql<number>`count(*)` })
    .from(contentOpportunities)
    .groupBy(contentOpportunities.status);
  return rows.map((r) => ({ status: r.status, n: Number(r.n) }));
}

export async function setOpportunityStatus(id: number, status: OpportunityStatus) {
  const [row] = await db
    .update(contentOpportunities)
    .set({ status })
    .where(eq(contentOpportunities.id, id))
    .returning();
  return row ?? null;
}

export async function listIntelJobs(limit = 20) {
  return db.select().from(intelJobs).orderBy(desc(intelJobs.id)).limit(limit);
}

/** Most recent finished collect/synthesize run — for the "last updated" indicator. */
export async function lastIntelRun() {
  const [job] = await db
    .select({ kind: intelJobs.kind, finishedAt: intelJobs.finishedAt, stats: intelJobs.stats })
    .from(intelJobs)
    .where(and(inArray(intelJobs.kind, ["collect", "synthesize"]), sql`${intelJobs.finishedAt} is not null`))
    .orderBy(desc(intelJobs.id))
    .limit(1);
  return job ?? null;
}

/** Convenience used by the dashboard trend list filter chips. */
export async function trendCountByStatus() {
  const rows = await db
    .select({ status: trends.status, n: sql<number>`count(*)` })
    .from(trends)
    .groupBy(trends.status);
  return rows.map((r) => ({ status: r.status, n: Number(r.n) }));
}
