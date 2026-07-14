/**
 * BaseAgent: every marketing agent is an independent module with its own role,
 * system prompt and output schema. The Orchestrator invokes them; each agent
 * stays pure (prompt + schema + input shaping) and testable in isolation.
 */
import type { z } from "zod";
import type { AgentKind } from "@/server/db/schema";
import { runStructured, type StructuredRunResult } from "@/server/services/ai/client";

export type AgentContext = { businessId?: number; taskId?: number };

export abstract class BaseAgent<TInput, TOutput> {
  /** Matches the `agent` value stored in agent_tasks. */
  abstract readonly kind: AgentKind;
  /** Short operation label for api_usage. */
  abstract readonly operation: string;
  /** Role + instructions. Kept specific so each agent has one clear job. */
  abstract readonly system: string;
  /** Zod schema constraining (and validating) the agent's output. */
  abstract readonly schema: z.ZodType<TOutput>;
  protected maxTokens = 2048;

  /** Turn typed input into the user message for this agent. */
  abstract buildUser(input: TInput): string;

  async run(input: TInput, ctx: AgentContext = {}): Promise<StructuredRunResult<TOutput>> {
    return runStructured<TOutput>({
      system: this.system,
      user: this.buildUser(input),
      schema: this.schema,
      maxTokens: this.maxTokens,
      operation: this.operation,
      businessId: ctx.businessId ?? null,
      taskId: ctx.taskId ?? null,
    });
  }
}
