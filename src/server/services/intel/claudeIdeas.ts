/**
 * "Trend × Claude" idea generation. For a given trend, runs the claude_angle agent
 * over the trend + its real evidence and persists concrete video/project ideas that
 * implement Claude on top of the trend. Tracked in intel_jobs (kind "ideas").
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { trends, trendEvidence, rawSignals, claudeIdeas } from "@/server/db/schema";
import { startJob, finishJob, runIntelTracked } from "./jobs";
import { claudeAngleAgent } from "@/server/services/ai/agents/intel/claudeAngle";

const norm = (s: string | undefined, fallback: string) => {
  const v = (s ?? "").trim().toLowerCase();
  if (v.includes("proyect") || v.includes("project") || v.includes("build")) return "proyecto";
  if (v.includes("video") || v.includes("reel") || v.includes("short")) return "video";
  return fallback;
};
const normPlatform = (p: string | undefined) => {
  const s = (p ?? "").toLowerCase();
  if (s.includes("tik")) return "tiktok";
  if (s.includes("you") || s.includes("short")) return "youtube";
  if (s.includes("insta") || s.includes("reel")) return "instagram";
  if (s.includes("face") || s.includes("fb")) return "facebook";
  return null;
};

export type IdeasResult = { jobId: number; trendId: number; generated: number };

export async function runClaudeIdeas(trendId: number): Promise<IdeasResult> {
  const job = await startJob("ideas");

  const [trend] = await db.select().from(trends).where(eq(trends.id, trendId)).limit(1);
  if (!trend) {
    await finishJob(job.id, "error", { generated: 0 });
    throw new Error(`Trend ${trendId} no existe`);
  }

  const evRows = await db
    .select({ title: rawSignals.title })
    .from(trendEvidence)
    .innerJoin(rawSignals, eq(trendEvidence.rawSignalId, rawSignals.id))
    .where(eq(trendEvidence.trendId, trendId))
    .orderBy(desc(rawSignals.observedAt))
    .limit(12);
  const evidence = evRows.map((e) => e.title ?? "").filter(Boolean);

  const res = await runIntelTracked(
    claudeAngleAgent,
    { trend: { title: trend.title, summary: trend.summary }, evidence },
    job.id,
  );
  if (!res) {
    await finishJob(job.id, "error", { generated: 0 });
    return { jobId: job.id, trendId, generated: 0 };
  }

  const d = res.data;
  const count = d.titles.length;
  let generated = 0;
  for (let i = 0; i < count; i++) {
    if (!d.titles[i]) continue;
    const kind = norm(d.kinds[i], "video");
    const steps = (d.stepsCsv[i] ?? "")
      .split(/\s*\|\s*|\n|(?:^|\s)\d+[.)]\s+/)
      .map((s) => s.trim().replace(/^[-*]\s*/, ""))
      .filter(Boolean)
      .slice(0, 8);
    await db.insert(claudeIdeas).values({
      trendId,
      jobId: job.id,
      kind,
      title: d.titles[i],
      hook: d.hooks[i] || null,
      claudeImpl: d.claudeImpls[i] || null,
      combo: d.combos[i] || trend.title,
      platform: kind === "proyecto" ? null : normPlatform(d.platforms[i]),
      steps: steps.length ? steps : null,
      impact: d.impacts[i] || null,
      difficulty: (d.difficulties[i] || "media").toLowerCase(),
      status: "nueva",
    });
    generated++;
  }

  await finishJob(job.id, generated > 0 ? "completada" : "error", { generated }, res.costUsd);
  return { jobId: job.id, trendId, generated };
}

/** Ideas for a trend (for the trend detail view). */
export async function listClaudeIdeas(trendId: number) {
  return db
    .select()
    .from(claudeIdeas)
    .where(eq(claudeIdeas.trendId, trendId))
    .orderBy(desc(claudeIdeas.id));
}
