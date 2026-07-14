/**
 * Business Match Agent — ranks which validated trends fit a SPECIFIC business,
 * with a one-line reason each. Reasons only over the trends passed in (cites real
 * ids); if nothing fits well it returns few with low fit. Flat, CLI-friendly schema.
 */
import { z } from "zod";
import { BaseAgent } from "@/server/services/ai/agents/base";

export type BusinessMatchInput = {
  business: { name: string; category: string | null; country: string | null; summary: string | null; opportunities: string[] };
  trends: { id: number; title: string; category: string | null; momentum: number | null }[];
};

export const BusinessMatchOutputSchema = z.object({
  trendIds: z.array(z.string()).describe("ids reales de los trends que encajan, mejor primero"),
  fits: z.array(z.string()).describe("encaje 0-100 por trend (alineado por índice)"),
  whys: z.array(z.string()).describe("por qué encaja con ESTE negocio, una frase (alineado por índice)"),
});
export type BusinessMatchOutput = z.infer<typeof BusinessMatchOutputSchema>;

export class BusinessMatchAgent extends BaseAgent<BusinessMatchInput, BusinessMatchOutput> {
  readonly kind = "business_match" as const;
  readonly operation = "business_match";
  readonly schema = BusinessMatchOutputSchema;
  protected maxTokens = 1536;
  readonly system = [
    "Eres un estratega de contenido. Recibes el perfil de UN negocio y una lista de TENDENCIAS reales (con id).",
    "Elige qué tendencias puede aprovechar este negocio para crear contenido, y explica por qué encaja con ÉL.",
    "Usa solo las tendencias dadas; cita sus ids reales. Si algo no encaja, dale un fit bajo o exclúyelo — no fuerces.",
    "No inventes tendencias ni métricas. Devuelve 3 arrays alineados por índice (trendIds, fits, whys). Responde en español.",
  ].join(" ");

  buildUser(input: BusinessMatchInput): string {
    const b = input.business;
    const trends = input.trends
      .map((t) => `#${t.id} ${t.title}${t.category ? ` [${t.category}]` : ""} (momentum ${t.momentum ?? "—"})`)
      .join("\n");
    return [
      "NEGOCIO:",
      `- Nombre: ${b.name}`,
      `- Categoría: ${b.category ?? "—"}`,
      `- País: ${b.country ?? "—"}`,
      `- Resumen: ${b.summary ?? "(sin research)"}`,
      `- Oportunidades detectadas: ${b.opportunities.join("; ") || "—"}`,
      "",
      "TENDENCIAS DISPONIBLES (elige y ordena por encaje, cita ids):",
      trends,
    ].join("\n");
  }
}

export const businessMatchAgent = new BusinessMatchAgent();
