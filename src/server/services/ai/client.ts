/**
 * Agent completion entrypoint. Dispatches to the configured provider:
 *   AI_PROVIDER=cli  → Claude Code headless on your Pro/Max subscription (default)
 *   AI_PROVIDER=api  → Anthropic Messages API (needs credit)
 *
 * Either way it validates the output against the zod schema and logs tokens + cost
 * to `api_usage`. Agents never touch the provider directly — they call `runStructured`.
 */
import type { z } from "zod";
import { env } from "@/server/config/env";
import { logApiUsage } from "@/server/services/usage/tracker";
import { runViaApi } from "@/server/services/ai/providers/api";
import { runViaCli } from "@/server/services/ai/providers/cli";

export type StructuredRunInput<T> = {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  operation: string;
  businessId?: number | null;
  taskId?: number | null;
};

export type StructuredRunResult<T> = {
  data: T;
  model: string;
  provider: "cli" | "api";
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export async function runStructured<T>(
  input: StructuredRunInput<T>,
): Promise<StructuredRunResult<T>> {
  const provider = env.AI_PROVIDER;
  const result =
    provider === "api"
      ? await runViaApi({ system: input.system, user: input.user, schema: input.schema, maxTokens: input.maxTokens })
      : await runViaCli({ system: input.system, user: input.user, schema: input.schema, maxTokens: input.maxTokens });

  // Validate against the schema regardless of provider (CLI output isn't guaranteed).
  const data = input.schema.parse(result.value);

  await logApiUsage({
    provider: "anthropic",
    operation: `${provider}:${input.operation}`,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
    businessId: input.businessId ?? null,
    taskId: input.taskId ?? null,
  });

  return {
    data,
    model: result.model,
    provider,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
  };
}
