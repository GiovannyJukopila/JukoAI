/**
 * Orchestrator / Manager Agent — coordinates the marketing team for one lead:
 *   Research → Audit/SEO → Copywriting
 *
 * Each step is recorded in `agent_tasks` (pending → en_progreso → completada/error)
 * with its result, tokens and cost, for full traceability and the dashboard's
 * operations view. Outputs are persisted to research_profiles / competitor_analyses
 * / outreach_messages. The run is tracked in `pipeline_runs`.
 *
 * Resilient: a failing agent records an error task and the pipeline continues with
 * whatever upstream output is available (Copywriting uses partial context if needed).
 */
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  businesses,
  audits,
  pipelineRuns,
  agentTasks,
  researchProfiles,
  competitorAnalyses,
  outreachMessages,
  type AgentKind,
} from "@/server/db/schema";
import { fetchText } from "@/server/lib/http";
import { saveDraft } from "@/server/services/social/publisher";
import { researchAgent, type ResearchOutput } from "@/server/services/ai/agents/research";
import { auditSeoAgent, type CompetitorRef, type AuditSeoOutput } from "@/server/services/ai/agents/auditSeo";
import { copywritingAgent, type CopywritingOutput } from "@/server/services/ai/agents/copywriting";
import type { BaseAgent, AgentContext } from "@/server/services/ai/agents/base";
import type { StructuredRunResult } from "@/server/services/ai/client";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
}

async function latestAudit(businessId: number) {
  const [a] = await db
    .select()
    .from(audits)
    .where(eq(audits.businessId, businessId))
    .orderBy(desc(audits.auditedAt))
    .limit(1);
  return a ?? null;
}

/** Up to 3 same-category/zone competitors with their latest audit signals. */
async function gatherCompetitors(b: typeof businesses.$inferSelect): Promise<CompetitorRef[]> {
  if (!b.zoneId || !b.category) return [];
  const rows = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.zoneId, b.zoneId), eq(businesses.category, b.category), ne(businesses.id, b.id)))
    .orderBy(sql`${businesses.reviewsCount} desc nulls last`)
    .limit(3);
  const out: CompetitorRef[] = [];
  for (const c of rows) {
    const ca = await latestAudit(c.id);
    out.push({
      name: c.name,
      rating: c.rating,
      reviewsCount: c.reviewsCount,
      opportunityScore: c.opportunityScore,
      issues: ca?.issues ?? [],
    });
  }
  return out;
}

/** Run one agent inside a tracked agent_task; returns its output or null on failure. */
async function runTracked<TInput, TOutput>(
  agent: BaseAgent<TInput, TOutput>,
  input: TInput,
  runId: number,
  businessId: number,
): Promise<StructuredRunResult<TOutput> | null> {
  // Small gap between agent calls to avoid bursting the provider (esp. the CLI
  // backend spawning back-to-back subprocesses), which reduces transient failures.
  await new Promise((r) => setTimeout(r, 800));
  const [task] = await db
    .insert(agentTasks)
    .values({ businessId, runId, agent: agent.kind, status: "en_progreso", startedAt: new Date() })
    .returning();
  try {
    const ctx: AgentContext = { businessId, taskId: task.id };
    const result = await agent.run(input, ctx);
    await db
      .update(agentTasks)
      .set({
        status: "completada",
        result: result.data as unknown as object,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: String(result.costUsd),
        finishedAt: new Date(),
      })
      .where(eq(agentTasks.id, task.id));
    return result;
  } catch (err) {
    await db
      .update(agentTasks)
      .set({ status: "error", errorMessage: (err as Error).message, finishedAt: new Date() })
      .where(eq(agentTasks.id, task.id));
    return null;
  }
}

export type PipelineResult = {
  runId: number;
  status: "completada" | "error";
  totalCostUsd: number;
  steps: { agent: AgentKind; ok: boolean; costUsd: number }[];
};

export type PipelineOptions = { senderName?: string; agencyName?: string; language?: "en" | "es" };

/** Execute the full Research → Audit/SEO → Copywriting pipeline for a business. */
export async function runPipeline(
  businessId: number,
  opts: PipelineOptions = {},
): Promise<PipelineResult> {
  const [b] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!b) throw new Error(`Business ${businessId} no existe`);

  const [run] = await db
    .insert(pipelineRuns)
    .values({ businessId, status: "en_progreso", startedAt: new Date() })
    .returning();

  const audit = await latestAudit(businessId);
  const steps: PipelineResult["steps"] = [];
  let totalCost = 0;

  // Optional homepage excerpt to enrich Research.
  let websiteExcerpt: string | null = null;
  if (b.website) {
    try {
      const res = await fetchText(b.website, { provider: "website", timeoutMs: 12000, retries: 0 });
      if (res.body) websiteExcerpt = stripHtml(res.body);
    } catch {
      /* non-fatal */
    }
  }

  // 1. Research
  const research = await runTracked(
    researchAgent,
    {
      name: b.name,
      category: b.category,
      website: b.website,
      address: b.address,
      country: b.country,
      rating: b.rating,
      reviewsCount: b.reviewsCount,
      auditIssues: audit?.issues ?? [],
      techSignals: audit?.techSignals ?? [],
      opportunityScore: b.opportunityScore,
      websiteExcerpt,
    },
    run.id,
    businessId,
  );
  steps.push({ agent: "research", ok: !!research, costUsd: research?.costUsd ?? 0 });
  if (research) {
    totalCost += research.costUsd;
    const r: ResearchOutput = research.data;
    await db.insert(researchProfiles).values({
      businessId,
      summary: r.summary,
      strengths: r.strengths,
      opportunities: r.opportunities,
      raw: { outreachAngle: r.outreachAngle } as object,
    });
  }

  // 2. Audit/SEO
  const competitors = await gatherCompetitors(b);
  const seo = await runTracked(
    auditSeoAgent,
    {
      name: b.name,
      category: b.category,
      zone: null,
      rating: b.rating,
      reviewsCount: b.reviewsCount,
      opportunityScore: b.opportunityScore,
      ownIssues: audit?.issues ?? [],
      competitors,
    },
    run.id,
    businessId,
  );
  steps.push({ agent: "audit_seo", ok: !!seo, costUsd: seo?.costUsd ?? 0 });
  if (seo) {
    totalCost += seo.costUsd;
    const s: AuditSeoOutput = seo.data;
    await db.insert(competitorAnalyses).values({
      businessId,
      competitors: competitors as unknown as object,
      contentGaps: s.contentGaps,
      seoGaps: s.seoGaps,
      summary: `${s.competitorComparison}\n\n${s.summary}`,
    });
  }

  // 3. Copywriting (uses Research + SEO output when available)
  const copy = await runTracked(
    copywritingAgent,
    {
      name: b.name,
      category: b.category,
      country: b.country,
      researchSummary: research?.data.summary ?? null,
      opportunities: research?.data.opportunities ?? [],
      outreachAngle: research?.data.outreachAngle ?? null,
      seoGaps: seo?.data.seoGaps ?? [],
      language: opts.language ?? "en",
      senderName: opts.senderName,
      agencyName: opts.agencyName ?? "Juko AI",
    },
    run.id,
    businessId,
  );
  steps.push({ agent: "copywriting", ok: !!copy, costUsd: copy?.costUsd ?? 0 });
  if (copy) {
    totalCost += copy.costUsd;
    const c: CopywritingOutput = copy.data;
    const [emailMsg] = await db
      .insert(outreachMessages)
      .values({
        businessId,
        channel: "email",
        subject: c.emailSubject,
        body: c.emailBody,
        contentIdeas: c.contentIdeas,
        model: copy.model,
        status: "borrador",
      })
      .returning();
    await db.insert(outreachMessages).values({
      businessId,
      channel: "whatsapp",
      subject: null,
      body: c.whatsappMessage,
      contentIdeas: null,
      model: copy.model,
      status: "borrador",
    });
    // Save each content idea as a social post DRAFT, ready for a future publisher.
    for (const idea of c.contentIdeas) {
      await saveDraft({ businessId, outreachMessageId: emailMsg.id, platform: "draft", content: idea });
    }
  }

  const status: PipelineResult["status"] = steps.every((s) => s.ok) ? "completada" : "error";
  await db
    .update(pipelineRuns)
    .set({ status, totalCostUsd: String(Number(totalCost.toFixed(6))), finishedAt: new Date() })
    .where(eq(pipelineRuns.id, run.id));

  return { runId: run.id, status, totalCostUsd: Number(totalCost.toFixed(6)), steps };
}
