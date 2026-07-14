import type { z } from "zod";

export type ProviderRequest = {
  system: string;
  user: string;
  schema: z.ZodType<unknown>;
  maxTokens?: number;
};

export type ProviderResult = {
  /** Parsed JS object the agent returned (validated by the caller against the schema). */
  value: unknown;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Real USD cost. 0 for the subscription-backed CLI provider. */
  costUsd: number;
};
