/**
 * Copywriting Agent — generates a personalized outreach message (email + WhatsApp)
 * and sample content ideas for the lead, using the Research Agent's findings.
 */
import { z } from "zod";
import { BaseAgent } from "@/server/services/ai/agents/base";

export type OutreachLanguage = "en" | "es";

export type CopywritingInput = {
  name: string;
  category?: string | null;
  country?: string | null;
  researchSummary?: string | null;
  opportunities?: string[] | null;
  outreachAngle?: string | null;
  seoGaps?: string[] | null;
  /** Language of the generated outreach message (default English). */
  language?: OutreachLanguage;
  /** Optional sender details for signatures / personalization. */
  senderName?: string;
  agencyName?: string;
};

export const CopywritingOutputSchema = z.object({
  emailSubject: z.string().describe("Asunto de email corto y atractivo."),
  emailBody: z
    .string()
    .describe("Email de outreach personalizado, breve, con un CTA claro. Sin inventar datos."),
  whatsappMessage: z
    .string()
    .describe("Versión corta para WhatsApp (1-3 frases), cercana y directa."),
  contentIdeas: z
    .array(z.string())
    .describe("3 ideas de post para sus redes sociales relevantes a su negocio."),
});
export type CopywritingOutput = z.infer<typeof CopywritingOutputSchema>;

export class CopywritingAgent extends BaseAgent<CopywritingInput, CopywritingOutput> {
  readonly kind = "copywriting" as const;
  readonly operation = "copywriting";
  readonly schema = CopywritingOutputSchema;
  protected maxTokens = 2048;
  readonly system = [
    "Eres un copywriter de outreach B2B para una agencia de desarrollo y automatización con IA.",
    "Escribes mensajes personalizados, honestos y no spam, que conectan una oportunidad real",
    "del negocio con nuestros servicios (automatización, web, e-commerce, chatbots).",
    "Tono profesional pero cercano. Breve. CTA claro (una llamada o respuesta).",
    "No inventes datos ni cifras que no estén en el contexto.",
    "Escribe el mensaje en el idioma que el usuario indique.",
  ].join(" ");

  buildUser(input: CopywritingInput): string {
    const lang = input.language === "es" ? "Español" : "English";
    return [
      `IDIOMA DE SALIDA: ${lang}. Escribe emailSubject, emailBody, whatsappMessage y contentIdeas íntegramente en ${lang}.`,
      `Negocio: ${input.name} (${input.category ?? "—"}, ${input.country ?? "—"})`,
      `Resumen research: ${input.researchSummary ?? "—"}`,
      `Oportunidades: ${(input.opportunities ?? []).join("; ") || "—"}`,
      `Ángulo de contacto sugerido: ${input.outreachAngle ?? "—"}`,
      `Gaps SEO: ${(input.seoGaps ?? []).join("; ") || "—"}`,
      `Remitente: ${input.senderName ?? "el equipo"} de ${input.agencyName ?? "Juko AI"}`,
    ].join("\n");
  }
}

export const copywritingAgent = new CopywritingAgent();
