/**
 * Trend Synthesis Agent — clusters already-collected raw_signals into named
 * trends. It reasons ONLY over the signals passed in and MUST cite the signal
 * ids that back each trend; anything not in the evidence does not exist. It
 * never invents metrics or URLs. Runs on the CLI provider like every other agent.
 */
import { z } from "zod";
import { BaseAgent } from "@/server/services/ai/agents/base";

export type SignalForSynthesis = {
  id: number;
  platform: string;
  title: string;
  points?: number;
  comments?: number;
};

export type TrendSynthesisInput = { signals: SignalForSynthesis[] };

/**
 * Flat, index-aligned arrays (arrays-of-strings) — this is the shape the CLI
 * provider's JSON template represents correctly, exactly like the research /
 * copywriting agents. Element i of each array describes the same trend.
 */
export const TrendSynthesisOutputSchema = z.object({
  titles: z.array(z.string()).describe("nombre corto y claro de cada trend"),
  summaries: z.array(z.string()).describe("1-2 frases por trend (alineado por índice con titles)"),
  categories: z.array(z.string()).describe("categoría de negocio por trend, o '' (alineado por índice)"),
  signalIds: z
    .array(z.string())
    .describe("ids de señales que respaldan cada trend, separados por comas, ej '12,15,18' (alineado por índice)"),
});
export type TrendSynthesisOutput = z.infer<typeof TrendSynthesisOutputSchema>;

export class TrendSynthesisAgent extends BaseAgent<TrendSynthesisInput, TrendSynthesisOutput> {
  readonly kind = "trend_synthesis" as const;
  readonly operation = "trend_synthesis";
  readonly schema = TrendSynthesisOutputSchema;
  protected maxTokens = 2048;
  readonly system = [
    "Eres un analista de tendencias. Recibes una lista de SEÑALES ya recopiladas de internet",
    "(cada una con id, plataforma, título y métricas de interacción).",
    "Agrupa las señales que hablan del mismo fenómeno en 'trends' con un nombre claro.",
    "REGLAS ESTRICTAS: no inventes tendencias que las señales no soporten; no inventes métricas ni URLs;",
    "cada trend DEBE citar en signalIds los ids reales de las señales que lo respaldan.",
    "Si algo no aparece en las señales, no existe. Prioriza temas con más señales o más interacción.",
    "Responde en español.",
  ].join(" ");

  buildUser(input: TrendSynthesisInput): string {
    const rows = input.signals
      .map((s) => `#${s.id} [${s.platform}] ${s.title}  (points=${s.points ?? 0}, comments=${s.comments ?? 0})`)
      .join("\n");
    return [
      "SEÑALES DISPONIBLES (agrupa por tema, cita los ids reales):",
      rows,
      "",
      "Devuelve entre 4 y 10 trends usando 4 arrays ALINEADOS POR ÍNDICE:",
      "titles[i], summaries[i], categories[i] (o ''), signalIds[i] (ids reales separados por comas, ej '3,7,9').",
      "El trend i se describe con el elemento i de cada array. No inventes ids que no estén arriba.",
    ].join("\n");
  }
}

export const trendSynthesisAgent = new TrendSynthesisAgent();
