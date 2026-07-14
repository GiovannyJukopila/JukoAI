/**
 * Audit/SEO Agent — extends Phase 1's technical audit with a competitor comparison
 * (2-3 similar businesses in the same category/zone) and detects content/SEO gaps.
 *
 * Competitor data is gathered from our own DB by the caller and passed in; the agent
 * turns it into a comparison narrative and concrete gaps we can pitch.
 */
import { z } from "zod";
import { BaseAgent } from "@/server/services/ai/agents/base";

export type CompetitorRef = {
  name: string;
  rating?: number | null;
  reviewsCount?: number | null;
  opportunityScore?: number | null;
  issues?: string[] | null;
};

export type AuditSeoInput = {
  name: string;
  category?: string | null;
  zone?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  opportunityScore?: number | null;
  ownIssues?: string[] | null;
  competitors: CompetitorRef[];
};

export const AuditSeoOutputSchema = z.object({
  competitorComparison: z
    .string()
    .describe("Comparativa del negocio frente a sus competidores (reputación, web, gaps)."),
  contentGaps: z.array(z.string()).describe("Gaps de contenido a explotar (2-4 puntos)."),
  seoGaps: z.array(z.string()).describe("Gaps de SEO técnico/on-page detectados o probables."),
  summary: z.string().describe("Conclusión accionable en 1-2 frases."),
});
export type AuditSeoOutput = z.infer<typeof AuditSeoOutputSchema>;

export class AuditSeoAgent extends BaseAgent<AuditSeoInput, AuditSeoOutput> {
  readonly kind = "audit_seo" as const;
  readonly operation = "audit_seo";
  readonly schema = AuditSeoOutputSchema;
  readonly system = [
    "Eres un especialista en SEO y auditoría competitiva para una agencia de desarrollo con IA.",
    "Compara el negocio objetivo con 2-3 competidores de su misma categoría y zona,",
    "y detecta gaps de contenido y SEO que podamos ofrecer resolver.",
    "Básate solo en los datos provistos (ratings, reviews, scores, problemas detectados).",
    "Sé concreto y accionable. Responde en español.",
  ].join(" ");

  buildUser(input: AuditSeoInput): string {
    const comp = input.competitors.length
      ? input.competitors
          .map(
            (c, i) =>
              `  ${i + 1}. ${c.name} — rating ${c.rating ?? "—"} (${c.reviewsCount ?? 0} reviews), ` +
              `score oportunidad ${c.opportunityScore ?? "—"}, problemas: ${(c.issues ?? []).join(", ") || "—"}`,
          )
          .join("\n")
      : "  (sin competidores con datos)";
    return [
      `Negocio objetivo: ${input.name}`,
      `Categoría: ${input.category ?? "—"} · Zona: ${input.zone ?? "—"}`,
      `Rating: ${input.rating ?? "—"} (${input.reviewsCount ?? 0} reviews) · Score: ${input.opportunityScore ?? "—"}`,
      `Problemas propios: ${(input.ownIssues ?? []).join(", ") || "ninguno"}`,
      "",
      "Competidores en la misma categoría/zona:",
      comp,
    ].join("\n");
  }
}

export const auditSeoAgent = new AuditSeoAgent();
