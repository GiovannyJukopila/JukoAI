/**
 * API provider — direct Anthropic Messages API with structured outputs.
 * Bills the account's API credit balance. Fast, with guaranteed schema validation.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env, requireKey } from "@/server/config/env";
import { estimateCost } from "@/server/services/ai/pricing";
import type { ProviderRequest, ProviderResult } from "@/server/services/ai/providers/types";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: requireKey(env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY") });
  }
  return _client;
}

export async function runViaApi(req: ProviderRequest): Promise<ProviderResult> {
  const model = env.ANTHROPIC_MODEL;
  const response = await getClient().messages.parse({
    model,
    max_tokens: req.maxTokens ?? 2048,
    system: req.system,
    messages: [{ role: "user", content: req.user }],
    output_config: { format: zodOutputFormat(req.schema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("La API de Claude rechazó la solicitud (refusal).");
  }
  if (response.parsed_output == null) {
    throw new Error("Claude no devolvió una salida válida según el esquema.");
  }

  return {
    value: response.parsed_output,
    model,
    inputTokens: response.usage.input_tokens ?? 0,
    outputTokens: response.usage.output_tokens ?? 0,
    costUsd: estimateCost(model, response.usage),
  };
}
