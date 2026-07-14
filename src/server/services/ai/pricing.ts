/** Anthropic model pricing (USD per 1M tokens). Update if Anthropic changes pricing. */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export type TokenUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

/** Estimate USD cost for a completion, accounting for cache read/write discounts. */
export function estimateCost(model: string, usage: TokenUsage): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING["claude-sonnet-4-6"];
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const usd =
    (input * p.input +
      output * p.output +
      cacheRead * p.input * 0.1 +
      cacheWrite * p.input * 1.25) /
    1_000_000;
  return Number(usd.toFixed(6));
}
