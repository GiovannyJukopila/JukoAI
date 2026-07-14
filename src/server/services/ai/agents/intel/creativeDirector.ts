/**
 * Creative Director Agent — turns matched trends into concrete, business-specific
 * short-video opportunities (one per trend). Full blueprint: hook, first 3s, script
 * beats, CTA, thumbnail, platform, editing. Flat, index-aligned arrays; every
 * opportunity echoes the trendId it was built from. Never invents metrics.
 */
import { z } from "zod";
import { BaseAgent } from "@/server/services/ai/agents/base";

export type CreativeInput = {
  business: { name: string; category: string | null; country: string | null; summary: string | null };
  trends: { id: number; title: string; summary: string | null }[];
};

export const CreativeOutputSchema = z.object({
  trendIds: z.array(z.string()).describe("id del trend del que nace cada idea (alineado)"),
  titles: z.array(z.string()).describe("título de cada video"),
  hooks: z.array(z.string()).describe("gancho/hook de cada video"),
  first3s: z.array(z.string()).describe("qué pasa en los primeros 3 segundos"),
  scripts: z.array(z.string()).describe("guion por beats, un beat por línea"),
  ctas: z.array(z.string()).describe("llamada a la acción final"),
  thumbnails: z.array(z.string()).describe("concepto de miniatura"),
  platforms: z.array(z.string()).describe("tiktok | instagram | youtube"),
  durations: z.array(z.string()).describe("duración estimada en segundos"),
  difficulties: z.array(z.string()).describe("baja | media | alta"),
  keywordsCsv: z.array(z.string()).describe("keywords separadas por comas"),
  hashtagsCsv: z.array(z.string()).describe("hashtags separados por comas"),
  editingCsv: z.array(z.string()).describe("sugerencias de edición separadas por comas"),
  reasonings: z.array(z.string()).describe("por qué esta idea encaja con ESTE negocio"),
});
export type CreativeOutput = z.infer<typeof CreativeOutputSchema>;

export class CreativeDirectorAgent extends BaseAgent<CreativeInput, CreativeOutput> {
  readonly kind = "creative_director" as const;
  readonly operation = "creative_director";
  readonly schema = CreativeOutputSchema;
  protected maxTokens = 3072;
  readonly system = [
    "Eres director creativo de video corto. Para un negocio concreto y unas tendencias reales,",
    "crea UNA idea de video accionable por tendencia, específica del negocio (no genérica).",
    "Cada idea: título, hook potente, primeros 3 segundos, guion por beats (una línea por beat),",
    "CTA, concepto de miniatura, plataforma ideal, duración, dificultad, keywords, hashtags y edición.",
    "Sé concreto y realista para el negocio dado. No inventes datos ni métricas de popularidad.",
    "Devuelve arrays alineados por índice; trendIds[i] es el id de la tendencia de la que nace la idea i.",
    "Responde en español.",
  ].join(" ");

  buildUser(input: CreativeInput): string {
    const b = input.business;
    const trends = input.trends
      .map((t) => `#${t.id} ${t.title}${t.summary ? ` — ${t.summary}` : ""}`)
      .join("\n");
    return [
      "NEGOCIO:",
      `- ${b.name} · ${b.category ?? "—"} · ${b.country ?? "—"}`,
      `- Contexto: ${b.summary ?? "(sin research)"}`,
      "",
      "TENDENCIAS SELECCIONADAS (crea una idea de video por cada una, cita su id en trendIds):",
      trends,
    ].join("\n");
  }
}

export const creativeDirectorAgent = new CreativeDirectorAgent();
