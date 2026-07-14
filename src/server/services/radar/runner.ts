/**
 * Radar IA (Fase 5) — agente Claude vía CLI (`claude -p`, suscripción Pro) que
 * busca lo último sobre Claude/Anthropic, OpenAI e IA para creación de
 * contenido en X, Reddit y noticias usando la tool WebSearch del propio CLI.
 *
 * A diferencia del provider genérico (single-turn, sin tools, schema plano),
 * este runner permite WebSearch y varios turnos, y parsea el JSON anidado a
 * mano con zod — la limitación de schemas planos aplica solo al template del
 * provider, no al modelo.
 *
 * El refresh es SIEMPRE manual desde la UI (control de consumo).
 */
import { execFile } from "node:child_process";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { radarItems, radarRuns, RADAR_SOURCES, RADAR_TOPICS } from "@/server/db/schema";
import { env } from "@/server/config/env";
import { logApiUsage } from "@/server/services/usage/tracker";

const itemSchema = z.object({
  topic: z.enum(RADAR_TOPICS),
  source: z.enum(RADAR_SOURCES),
  title: z.string().min(3),
  summary: z.string().optional().default(""),
  url: z.string().optional().default(""),
  sentiment: z.enum(["positivo", "neutral", "negativo"]).optional().default("neutral"),
  relevance: z.number().min(0).max(100).optional().default(50),
  published_hint: z.string().optional().default(""),
});
const outputSchema = z.object({ items: z.array(itemSchema).min(1).max(30) });

const SYSTEM = `Eres el Radar IA de un estudio de contenido. Tu trabajo: encontrar las novedades MÁS recientes y relevantes (últimas 48-72 horas si es posible) sobre estos 3 temas:
1. "claude" — Claude, Anthropic, Claude Code, MCP, releases y noticias de Anthropic.
2. "openai" — OpenAI, ChatGPT, GPT, Sora y noticias de OpenAI.
3. "content_ai" — IA para creación de contenido (video, imagen, audio, social): herramientas, tendencias y lanzamientos.

Usa la tool WebSearch varias veces (mínimo una búsqueda por tema; incluye "site:reddit.com" y "twitter OR x.com" en algunas queries para cubrir Reddit y X además de noticias). Clasifica cada hallazgo:
- source: "x" (posts/hilos de X/Twitter), "reddit" (posts de Reddit) o "news" (medios/blogs).
- sentiment: percepción de la comunidad ("positivo" | "neutral" | "negativo").
- relevance: 0-100 para un creador de contenido sobre IA.
- published_hint: cuándo se publicó, como texto corto ("hace 5 h", "12 jul").

RESPUESTA FINAL: SOLO un objeto JSON válido, sin \`\`\` ni texto extra:
{"items":[{"topic":"claude","source":"news","title":"…","summary":"1-2 frases en español","url":"https://…","sentiment":"positivo","relevance":85,"published_hint":"hace 3 h"}]}
Entre 9 y 18 items, balanceados entre los 3 temas y con las 3 fuentes representadas cuando existan.`;

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("La respuesta del agente no contenía JSON.");
  return JSON.parse(match[0]);
}

type Envelope = {
  type: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
};

async function invokeClaude(): Promise<Envelope> {
  const childEnv = { ...process.env };
  delete childEnv.ANTHROPIC_API_KEY; // suscripción, nunca API de pago
  delete childEnv.ANTHROPIC_AUTH_TOKEN;
  if (env.CLAUDE_CLI_CONFIG_DIR) childEnv.CLAUDE_CONFIG_DIR = env.CLAUDE_CLI_CONFIG_DIR;

  const args = [
    "-p",
    "Busca las novedades de ahora mismo y devuelve el JSON pedido.",
    "--output-format", "json",
    "--model", env.CLAUDE_CLI_MODEL,
    "--max-turns", "15",
    "--allowedTools", "WebSearch",
    "--system-prompt", SYSTEM,
    "--exclude-dynamic-system-prompt-sections",
  ];

  const stdout = await new Promise<string>((resolve, reject) => {
    const child = execFile(
      env.CLAUDE_CLI_BIN,
      args,
      { env: childEnv, timeout: 280_000, maxBuffer: 20 * 1024 * 1024, cwd: "/tmp" },
      (err, out, errOut) => {
        if (err) {
          const reason = (out || errOut || "").trim().slice(0, 300);
          reject(new Error(`claude CLI falló: ${reason || (err as Error).message}`));
          return;
        }
        resolve(out);
      },
    );
    child.stdin?.end();
  });
  return JSON.parse(stdout) as Envelope;
}

/** Ejecuta el radar: crea un run, guarda items y devuelve el resultado. */
export async function runRadar() {
  const [run] = await db.insert(radarRuns).values({ status: "ok" }).returning();
  try {
    const envelope = await invokeClaude();
    if (envelope.is_error || envelope.subtype !== "success" || !envelope.result) {
      throw new Error(`CLI devolvió error: ${(envelope.result ?? envelope.subtype ?? "").toString().slice(0, 200)}`);
    }
    const parsed = outputSchema.parse(extractJson(envelope.result));

    await db.insert(radarItems).values(
      parsed.items.map((it) => ({
        runId: run.id,
        topic: it.topic,
        source: it.source,
        title: it.title.slice(0, 300),
        summary: it.summary || null,
        url: it.url || null,
        sentiment: it.sentiment,
        relevance: Math.round(it.relevance),
        publishedHint: it.published_hint || null,
      })),
    );
    const stats = { items: parsed.items.length };
    await db.update(radarRuns).set({ finishedAt: new Date(), stats }).where(eq(radarRuns.id, run.id));
    await logApiUsage({
      provider: "anthropic",
      operation: "cli:radar_refresh",
      model: env.CLAUDE_CLI_MODEL,
      inputTokens: envelope.usage?.input_tokens ?? 0,
      outputTokens: envelope.usage?.output_tokens ?? 0,
      costUsd: 0, // suscripción
    });
    return getLatestRadar();
  } catch (err) {
    await db
      .update(radarRuns)
      .set({ status: "error", error: (err as Error).message.slice(0, 500), finishedAt: new Date() })
      .where(eq(radarRuns.id, run.id));
    throw err;
  }
}

/** Último run OK con sus items (caché para 5.4: abrir la sección no re-consulta). */
export async function getLatestRadar() {
  const [run] = await db
    .select()
    .from(radarRuns)
    .where(eq(radarRuns.status, "ok"))
    .orderBy(desc(radarRuns.id))
    .limit(1);
  if (!run || !run.finishedAt) return { run: null, items: [] };
  const items = await db
    .select()
    .from(radarItems)
    .where(eq(radarItems.runId, run.id))
    .orderBy(desc(radarItems.relevance));
  return { run: { id: run.id, finishedAt: run.finishedAt, stats: run.stats }, items };
}
