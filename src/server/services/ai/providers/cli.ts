/**
 * CLI provider — runs Claude Code headless (`claude -p`) using the user's Pro/Max
 * SUBSCRIPTION instead of API credit. Designed for personal, low-volume use.
 *
 * - Replaces Claude Code's default system prompt with the agent's own (and excludes
 *   dynamic sections) so token overhead stays small.
 * - Forces JSON-only output via the prompt + a schema-derived field template, then
 *   extracts and parses the JSON from the result envelope.
 * - Strips ANTHROPIC_API_KEY from the child env so auth uses the subscription login.
 *
 * Caveats: subscription rate limits apply; each call is a subprocess (slower than the
 * API); output is prompt-constrained JSON (validated by the caller against the schema).
 */
import { execFile } from "node:child_process";
import { z } from "zod";
import { env } from "@/server/config/env";
import type { ProviderRequest, ProviderResult } from "@/server/services/ai/providers/types";

type Envelope = {
  type: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
};

/** Build a JSON shape hint from a zod object schema to steer the CLI output. */
function describeSchema(schema: z.ZodType<unknown>): string {
  if (!(schema instanceof z.ZodObject)) return "un objeto JSON válido";
  const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
  const lines: string[] = [];
  for (const [key, rawField] of Object.entries(shape)) {
    let f: unknown = rawField;
    let optional = false;
    while (f instanceof z.ZodOptional || f instanceof z.ZodNullable) {
      optional = true;
      f = f.unwrap();
    }
    let placeholder = '"..."';
    let typeLabel = "string";
    if (f instanceof z.ZodArray) {
      placeholder = '["...", "..."]';
      typeLabel = "array de strings";
    } else if (f instanceof z.ZodNumber) {
      placeholder = "0";
      typeLabel = "number";
    } else if (f instanceof z.ZodBoolean) {
      placeholder = "true";
      typeLabel = "boolean";
    }
    const desc =
      (rawField as { description?: string }).description ??
      (f as { description?: string }).description ??
      "";
    lines.push(
      `  "${key}": ${placeholder}  // ${typeLabel}${optional ? ", opcional" : ""}${desc ? ` — ${desc}` : ""}`,
    );
  }
  return `{\n${lines.join("\n")}\n}`;
}

function extractJson(text: string): unknown {
  // Strip code fences if present, then grab the outermost JSON object.
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("La respuesta del CLI no contenía un objeto JSON.");
  return JSON.parse(match[0]);
}

export async function runViaCli(req: ProviderRequest): Promise<ProviderResult> {
  const template = describeSchema(req.schema);
  const system = [
    req.system,
    "",
    "FORMATO DE SALIDA OBLIGATORIO: responde ÚNICAMENTE con un objeto JSON válido,",
    "sin texto antes ni después y sin ``` . Usa exactamente estas claves:",
    template,
  ].join("\n");

  const childEnv = { ...process.env };
  delete childEnv.ANTHROPIC_API_KEY; // force subscription auth
  delete childEnv.ANTHROPIC_AUTH_TOKEN;
  // Pin the account whose subscription the agents consume (e.g. ~/.claude-personal),
  // regardless of which account the server process happens to inherit.
  if (env.CLAUDE_CLI_CONFIG_DIR) childEnv.CLAUDE_CONFIG_DIR = env.CLAUDE_CLI_CONFIG_DIR;

  const args = [
    "-p",
    req.user,
    "--output-format",
    "json",
    "--model",
    env.CLAUDE_CLI_MODEL,
    "--max-turns",
    "1",
    "--allowedTools",
    "",
    "--system-prompt",
    system,
    "--exclude-dynamic-system-prompt-sections",
  ];

  // Run `claude -p`, closing stdin immediately so Claude Code reads EOF and doesn't
  // wait on (or hang on) stdin. Retried once on transient process failures.
  async function invoke(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const child = execFile(
        env.CLAUDE_CLI_BIN,
        args,
        { env: childEnv, timeout: 180_000, maxBuffer: 20 * 1024 * 1024, cwd: "/tmp" },
        (err, out, errOut) => {
          if (err) {
            const e = err as NodeJS.ErrnoException & { code?: number | string; killed?: boolean };
            // On failure the CLI usually explains itself on STDOUT (often a JSON
            // envelope, e.g. usage-limit reached) while stderr stays empty — so
            // surface both. Try to extract the envelope's message first.
            let reason = "";
            try {
              const env2 = JSON.parse(out || "") as Envelope;
              reason = (env2.result ?? env2.subtype ?? "").toString().slice(0, 300);
            } catch {
              reason = (out || "").trim().slice(0, 300);
            }
            const detail =
              `code=${e.code} killed=${e.killed}` +
              (reason ? ` motivo=${reason}` : "") +
              (errOut?.trim() ? ` stderr=${errOut.trim().slice(0, 300)}` : "");
            reject(new Error(`claude CLI falló: ${detail}`));
            return;
          }
          resolve(out);
        },
      );
      // No piped input — close stdin so the CLI doesn't block waiting for it.
      child.stdin?.end();
    });
  }

  let stdout: string;
  try {
    stdout = await invoke();
  } catch {
    await new Promise((r) => setTimeout(r, 1500));
    stdout = await invoke(); // one retry for transient failures
  }

  let envelope: Envelope;
  try {
    envelope = JSON.parse(stdout) as Envelope;
  } catch {
    throw new Error("No se pudo parsear la respuesta del CLI de Claude.");
  }
  if (envelope.is_error || envelope.subtype !== "success" || !envelope.result) {
    throw new Error(`El CLI de Claude devolvió un error: ${envelope.result ?? envelope.subtype}`);
  }

  return {
    value: extractJson(envelope.result),
    model: env.CLAUDE_CLI_MODEL,
    inputTokens: envelope.usage?.input_tokens ?? 0,
    outputTokens: envelope.usage?.output_tokens ?? 0,
    costUsd: 0, // covered by the subscription
  };
}
