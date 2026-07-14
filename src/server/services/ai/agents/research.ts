/**
 * Research Agent — enriches a lead's profile from the data we already collected
 * (Places fields + audit signals + an optional homepage text excerpt) and frames
 * its current situation and the concrete opportunities for our services.
 *
 * Deliberately works from provided context (no live browsing) to stay cheap and
 * deterministic; the orchestrator may pass a homepage excerpt for more signal.
 */
import { z } from "zod";
import { BaseAgent } from "@/server/services/ai/agents/base";

export type ResearchInput = {
  name: string;
  category?: string | null;
  website?: string | null;
  address?: string | null;
  country?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  auditIssues?: string[] | null;
  techSignals?: string[] | null;
  opportunityScore?: number | null;
  websiteExcerpt?: string | null;
};

export const ResearchOutputSchema = z.object({
  summary: z
    .string()
    .describe("2-4 frases: a qué se dedica el negocio y su situación digital actual."),
  strengths: z.array(z.string()).describe("Qué hace bien (2-4 puntos)."),
  opportunities: z
    .array(z.string())
    .describe("Oportunidades de mejora concretas que nuestros servicios pueden resolver."),
  outreachAngle: z
    .string()
    .describe("El mejor ángulo único para iniciar el contacto, en una frase."),
});
export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;

export class ResearchAgent extends BaseAgent<ResearchInput, ResearchOutput> {
  readonly kind = "research" as const;
  readonly operation = "research";
  readonly schema = ResearchOutputSchema;
  readonly system = [
    "Eres un analista de research B2B para una agencia de desarrollo y automatización con IA.",
    "Tu trabajo: a partir de los datos de un negocio (categoría, web, reviews, auditoría técnica),",
    "resumir su situación digital y detectar oportunidades reales para nuestros servicios:",
    "automatización con IA, desarrollo/optimización web, e-commerce y chatbots.",
    "Sé concreto y honesto: básate solo en los datos provistos, no inventes hechos ni URLs.",
    "Responde en español, en tono profesional y directo.",
  ].join(" ");

  buildUser(input: ResearchInput): string {
    const lines = [
      `Negocio: ${input.name}`,
      `Categoría: ${input.category ?? "—"}`,
      `País: ${input.country ?? "—"}`,
      `Web: ${input.website ?? "(sin web)"}`,
      `Rating Google: ${input.rating ?? "—"} (${input.reviewsCount ?? 0} reviews)`,
      `Score de oportunidad (0-100): ${input.opportunityScore ?? "—"}`,
      `Problemas detectados en auditoría: ${(input.auditIssues ?? []).join(", ") || "ninguno"}`,
      `Tecnologías detectadas: ${(input.techSignals ?? []).join(", ") || "—"}`,
    ];
    if (input.websiteExcerpt) {
      lines.push("", "Extracto del texto de su web:", input.websiteExcerpt.slice(0, 1500));
    }
    return lines.join("\n");
  }
}

export const researchAgent = new ResearchAgent();
