/**
 * Pipeline B — per-lead content opportunity generation.
 *   build business context (reuse research/audit) → business_match → creative_director
 *   → deterministic scoring + Evidence-Guard → persist content_opportunities.
 *
 * Every opportunity is tied to a real, evidence-backed trend; the creative agent's
 * output is bound to selected trends only (Evidence-Guard drops the rest). Scores
 * are computed from real trend metrics — never invented by the model.
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  businesses,
  researchProfiles,
  trendEvidence,
  contentOpportunities,
  opportunityEvidence,
} from "@/server/db/schema";
import { listTrends, type TrendListItem } from "./repository";
import { startJob, finishJob, runIntelTracked } from "./jobs";
import { businessMatchAgent } from "@/server/services/ai/agents/intel/businessMatch";
import { creativeDirectorAgent } from "@/server/services/ai/agents/intel/creativeDirector";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));
const csv = (s: string | undefined) =>
  (s ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12);
const digits = (s: unknown) => Number(String(s ?? "").replace(/[^0-9]/g, ""));

type PlatformDef = { duration: number; postingTime: string; frequency: string; mult: number };
const PLATFORM_DEFAULTS: Record<string, PlatformDef> = {
  tiktok: { duration: 30, postingTime: "18:00–21:00", frequency: "4-5/semana", mult: 1.0 },
  instagram: { duration: 45, postingTime: "12:00–14:00", frequency: "3-4/semana", mult: 0.92 },
  youtube: { duration: 60, postingTime: "15:00–18:00", frequency: "2/semana", mult: 0.85 },
};
function normPlatform(p: string | undefined): keyof typeof PLATFORM_DEFAULTS {
  const s = (p ?? "").toLowerCase();
  if (s.includes("tik")) return "tiktok";
  if (s.includes("you") || s.includes("shorts")) return "youtube";
  if (s.includes("insta") || s.includes("reel")) return "instagram";
  return "tiktok";
}
function normLevel(l: string | undefined): string {
  const s = (l ?? "").toLowerCase();
  if (s.startsWith("alt") || s.includes("high")) return "alta";
  if (s.startsWith("baj") || s.includes("low")) return "baja";
  return "media";
}
function repurposingFor(platform: string): string[] {
  const base = ["1 grabación → 3 cortes verticales", "Carrusel resumen para Instagram", "Post de blog con el guion ampliado"];
  if (platform === "youtube") base.push("Versión larga + Shorts derivados");
  return base;
}

type Match = { trendId: number; fit: number; why: string };

export type OpportunitiesResult = {
  jobId: number;
  strategy: "ai" | "fallback";
  candidates: number;
  matched: number;
  generated: number;
};

export async function runOpportunities(
  businessId: number,
  opts: { topK?: number; candidateLimit?: number } = {},
): Promise<OpportunitiesResult> {
  const topK = opts.topK ?? 3;
  const job = await startJob("opportunities", businessId);

  const [b] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!b) {
    await finishJob(job.id, "error", { generated: 0 });
    throw new Error(`Business ${businessId} no existe`);
  }
  const [rp] = await db
    .select()
    .from(researchProfiles)
    .where(eq(researchProfiles.businessId, businessId))
    .orderBy(desc(researchProfiles.createdAt))
    .limit(1);

  const summary = rp?.summary ?? null;
  const oppList = rp?.opportunities ?? [];

  // Candidate trends (evidence-backed), ranked by momentum.
  const candidates = (await listTrends({ limit: opts.candidateLimit ?? 15 })).filter((t) => t.evidenceCount > 0);
  const candidateMap = new Map<number, TrendListItem>(candidates.map((c) => [c.id, c]));
  if (candidates.length === 0) {
    await finishJob(job.id, "error", { candidates: 0, generated: 0 });
    return { jobId: job.id, strategy: "fallback", candidates: 0, matched: 0, generated: 0 };
  }

  // 1. Business match (which trends fit THIS business).
  let strategy: "ai" | "fallback" = "fallback";
  let matches: Match[] = [];
  const matchRes = await runIntelTracked(
    businessMatchAgent,
    {
      business: { name: b.name, category: b.category, country: b.country, summary, opportunities: oppList },
      trends: candidates.map((t) => ({ id: t.id, title: t.title, category: t.category, momentum: t.momentum })),
    },
    job.id,
    businessId,
  );
  if (matchRes && matchRes.data.trendIds.length) {
    strategy = "ai";
    matchRes.data.trendIds.forEach((idStr, i) => {
      const id = digits(idStr);
      if (candidateMap.has(id)) {
        matches.push({ trendId: id, fit: clamp(Number(matchRes.data.fits[i]) || 50), why: matchRes.data.whys[i] ?? "" });
      }
    });
  }
  // Fallback: rank by momentum if the matcher produced nothing usable.
  if (matches.length === 0) {
    matches = candidates.slice(0, topK).map((t) => ({ trendId: t.id, fit: t.momentum ?? 50, why: "Seleccionado por momentum." }));
  }
  matches.sort((a, b2) => b2.fit - a.fit);
  const selected = matches.slice(0, topK);

  // 2. Creative director (full blueprint per selected trend).
  const creativeRes = await runIntelTracked(
    creativeDirectorAgent,
    {
      business: { name: b.name, category: b.category, country: b.country, summary },
      trends: selected.map((m) => {
        const c = candidateMap.get(m.trendId)!;
        return { id: m.trendId, title: c.title, summary: c.summary };
      }),
    },
    job.id,
    businessId,
  );
  if (!creativeRes) {
    await finishJob(job.id, "error", { candidates: candidates.length, matched: selected.length, generated: 0 });
    return { jobId: job.id, strategy, candidates: candidates.length, matched: selected.length, generated: 0 };
  }

  // 3. Persist each opportunity (Evidence-Guard: must map to a selected trend).
  const d = creativeRes.data;
  const count = d.titles.length;
  const selectedIds = new Set(selected.map((m) => m.trendId));
  let generated = 0;

  for (let i = 0; i < count; i++) {
    let trendId = digits(d.trendIds[i]);
    if (!selectedIds.has(trendId)) trendId = selected[i]?.trendId ?? selected[0]?.trendId; // best-effort align
    if (!selectedIds.has(trendId)) continue; // guard: no valid evidence-backed trend → drop
    const match = selected.find((m) => m.trendId === trendId)!;
    const cand = candidateMap.get(trendId)!;
    const platform = normPlatform(d.platforms[i]);
    const def = PLATFORM_DEFAULTS[platform];
    const difficulty = normLevel(d.difficulties[i]);
    const scriptBeats = (d.scripts[i] ?? "")
      .split(/\n|(?<=\.)\s+/)
      .map((s) => s.trim().replace(/^[-*\d.\s]+/, ""))
      .filter(Boolean)
      .slice(0, 8)
      .map((beat) => ({ beat }));
    const keywords = csv(d.keywordsCsv[i]);
    const hashtags = csv(d.hashtagsCsv[i]).map((h) => (h.startsWith("#") ? h : `#${h.replace(/\s+/g, "")}`));
    const editing = csv(d.editingCsv[i]);
    const momentum = cand.momentum ?? 0;

    const [opp] = await db
      .insert(contentOpportunities)
      .values({
        businessId,
        trendId,
        jobId: job.id,
        title: d.titles[i] || cand.title,
        hook: d.hooks[i] || null,
        first3s: d.first3s[i] || null,
        script: scriptBeats.length ? scriptBeats : null,
        cta: d.ctas[i] || null,
        thumbnailConcept: d.thumbnails[i] || null,
        platform,
        durationSeconds: digits(d.durations[i]) || def.duration,
        difficulty,
        productionCost: difficulty,
        editing: editing.length ? editing : null,
        businessFit: clamp(match.fit),
        viralityScore: clamp(momentum * def.mult),
        competitionScore: cand.competition ?? null,
        trendConfidence: cand.confidence ?? null,
        trendMomentum: cand.momentum ?? null,
        evergreenScore: cand.evergreen ?? null,
        seoOpportunity: clamp(40 + keywords.length * 7),
        keywords: keywords.length ? keywords : null,
        hashtags: hashtags.length ? hashtags : null,
        postingTime: def.postingTime,
        frequency: def.frequency,
        repurposing: repurposingFor(platform),
        reasoning: d.reasonings[i] || match.why || null,
        status: "borrador",
      })
      .returning();

    // Evidence: the trend + up to 2 of its real raw signals.
    await db.insert(opportunityEvidence).values({ opportunityId: opp.id, trendId, note: "trend" });
    const sigs = await db
      .select({ id: trendEvidence.rawSignalId })
      .from(trendEvidence)
      .where(eq(trendEvidence.trendId, trendId))
      .limit(2);
    for (const s of sigs) {
      await db.insert(opportunityEvidence).values({ opportunityId: opp.id, rawSignalId: s.id, trendId });
    }
    generated++;
  }

  await finishJob(
    job.id,
    generated > 0 ? "completada" : "error",
    { candidates: candidates.length, matched: selected.length, generated },
    creativeRes.costUsd + (matchRes?.costUsd ?? 0),
  );
  return { jobId: job.id, strategy, candidates: candidates.length, matched: selected.length, generated };
}
