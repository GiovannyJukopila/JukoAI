/**
 * intel_jobs / intel_job_tasks helpers — the same run/step telemetry the marketing
 * orchestrator uses (pipeline_runs / agent_tasks), generalized to global jobs.
 */
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { intelJobs, intelJobTasks } from "@/server/db/schema";
import type { BaseAgent, AgentContext } from "@/server/services/ai/agents/base";
import type { StructuredRunResult } from "@/server/services/ai/client";

export async function startJob(kind: string, businessId: number | null = null) {
  const [job] = await db
    .insert(intelJobs)
    .values({ kind, businessId, status: "en_progreso", startedAt: new Date() })
    .returning();
  return job;
}

export async function finishJob(
  jobId: number,
  status: "completada" | "error",
  stats: Record<string, number>,
  totalCostUsd = 0,
) {
  await db
    .update(intelJobs)
    .set({ status, stats, totalCostUsd: String(Number(totalCostUsd.toFixed(6))), finishedAt: new Date() })
    .where(eq(intelJobs.id, jobId));
}

/** Run one agent inside a tracked intel_job_task; returns its output or null on failure. */
export async function runIntelTracked<TInput, TOutput>(
  agent: BaseAgent<TInput, TOutput>,
  input: TInput,
  jobId: number,
  businessId: number | null = null,
): Promise<StructuredRunResult<TOutput> | null> {
  // Same anti-burst gap the CLI provider needs between subprocess calls.
  await new Promise((r) => setTimeout(r, 800));
  const [task] = await db
    .insert(intelJobTasks)
    .values({ jobId, businessId, agent: agent.kind, status: "en_progreso", startedAt: new Date() })
    .returning();
  try {
    // NOTE: do NOT pass taskId here. runStructured logs api_usage.task_id, whose FK
    // references agent_tasks (the marketing pipeline) — not intel_job_tasks. Tokens are
    // already recorded on intel_job_tasks below, so we log usage with a null task_id.
    const ctx: AgentContext = { businessId: businessId ?? undefined };
    const result = await agent.run(input, ctx);
    await db
      .update(intelJobTasks)
      .set({
        status: "completada",
        result: result.data as unknown as object,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: String(result.costUsd),
        finishedAt: new Date(),
      })
      .where(eq(intelJobTasks.id, task.id));
    return result;
  } catch (err) {
    await db
      .update(intelJobTasks)
      .set({ status: "error", errorMessage: (err as Error).message, finishedAt: new Date() })
      .where(eq(intelJobTasks.id, task.id));
    return null;
  }
}
