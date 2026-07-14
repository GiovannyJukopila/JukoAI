/**
 * Central API usage / cost logging. Every external paid call (Places, PageSpeed,
 * Anthropic) records a row here so the dashboard can show spend without guessing.
 *
 * Cost constants are rough public-list estimates and are easy to adjust; the
 * source of truth for "how many calls" is the row count, cost is informational.
 */
import { db } from "@/server/db/client";
import { apiUsage } from "@/server/db/schema";
import { sql } from "drizzle-orm";

// Approximate USD list prices (update if Google/Anthropic change pricing).
export const COST = {
  // Places API (New) Text Search — Pro tier, per request.
  placesTextSearch: 0.032,
  // PageSpeed Insights API is free; logged with 0 cost for call-count visibility.
  pagespeed: 0,
};

export type UsageInput = {
  provider: "anthropic" | "google_places" | "pagespeed";
  operation: string;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number;
  businessId?: number | null;
  taskId?: number | null;
  requestCount?: number;
};

export async function logApiUsage(input: UsageInput): Promise<void> {
  await db.insert(apiUsage).values({
    provider: input.provider,
    operation: input.operation,
    model: input.model ?? null,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    costUsd: String(input.costUsd ?? 0),
    businessId: input.businessId ?? null,
    taskId: input.taskId ?? null,
    requestCount: input.requestCount ?? 1,
  });
}

/** Aggregate usage by provider (and overall) for the dashboard cost panel. */
export async function usageSummary() {
  const rows = await db
    .select({
      provider: apiUsage.provider,
      requests: sql<number>`coalesce(sum(${apiUsage.requestCount}),0)`,
      inputTokens: sql<number>`coalesce(sum(${apiUsage.inputTokens}),0)`,
      outputTokens: sql<number>`coalesce(sum(${apiUsage.outputTokens}),0)`,
      costUsd: sql<number>`coalesce(sum(${apiUsage.costUsd}),0)`,
    })
    .from(apiUsage)
    .groupBy(apiUsage.provider);

  const total = rows.reduce(
    (acc, r) => {
      acc.requests += Number(r.requests);
      acc.costUsd += Number(r.costUsd);
      return acc;
    },
    { requests: 0, costUsd: 0 },
  );

  return {
    byProvider: rows.map((r) => ({
      provider: r.provider,
      requests: Number(r.requests),
      inputTokens: Number(r.inputTokens),
      outputTokens: Number(r.outputTokens),
      costUsd: Number(r.costUsd),
    })),
    total,
  };
}
