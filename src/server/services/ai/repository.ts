/** Read models for the Phase 2 agent outputs and the operations center. */
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  businesses,
  researchProfiles,
  competitorAnalyses,
  outreachMessages,
  agentTasks,
  pipelineRuns,
} from "@/server/db/schema";

/** All Phase 2 artifacts for a single lead (for the detail tabs). */
export async function getLeadAgentData(businessId: number) {
  const [research] = await db
    .select()
    .from(researchProfiles)
    .where(eq(researchProfiles.businessId, businessId))
    .orderBy(desc(researchProfiles.createdAt))
    .limit(1);
  const [competitor] = await db
    .select()
    .from(competitorAnalyses)
    .where(eq(competitorAnalyses.businessId, businessId))
    .orderBy(desc(competitorAnalyses.createdAt))
    .limit(1);
  const messages = await db
    .select()
    .from(outreachMessages)
    .where(eq(outreachMessages.businessId, businessId))
    .orderBy(desc(outreachMessages.createdAt));
  const tasks = await db
    .select()
    .from(agentTasks)
    .where(eq(agentTasks.businessId, businessId))
    .orderBy(desc(agentTasks.createdAt))
    .limit(30);
  return {
    research: research ?? null,
    competitor: competitor ?? null,
    messages,
    tasks,
  };
}

/**
 * Operations center feed: recent pipeline runs with lead name + their agent tasks.
 * Polled by the dashboard to show what each agent is doing in near real-time.
 */
export async function listOperations(limit = 25) {
  const runs = await db
    .select({
      runId: pipelineRuns.id,
      businessId: pipelineRuns.businessId,
      name: businesses.name,
      status: pipelineRuns.status,
      startedAt: pipelineRuns.startedAt,
      finishedAt: pipelineRuns.finishedAt,
      totalCostUsd: pipelineRuns.totalCostUsd,
    })
    .from(pipelineRuns)
    .innerJoin(businesses, eq(pipelineRuns.businessId, businesses.id))
    .orderBy(desc(pipelineRuns.id))
    .limit(limit);

  const tasks = await db
    .select({
      runId: agentTasks.runId,
      agent: agentTasks.agent,
      status: agentTasks.status,
      costUsd: agentTasks.costUsd,
      errorMessage: agentTasks.errorMessage,
    })
    .from(agentTasks)
    .orderBy(desc(agentTasks.id))
    .limit(limit * 4);

  const tasksByRun = new Map<number, typeof tasks>();
  for (const t of tasks) {
    if (t.runId == null) continue;
    if (!tasksByRun.has(t.runId)) tasksByRun.set(t.runId, []);
    tasksByRun.get(t.runId)!.push(t);
  }

  return runs.map((r) => ({ ...r, tasks: tasksByRun.get(r.runId) ?? [] }));
}
