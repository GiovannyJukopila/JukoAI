/**
 * Claude Angle Agent — the "top trend × Claude" idea generator.
 * Given a trending tool/topic (with real evidence), it proposes concrete social
 * videos AND buildable projects that IMPLEMENT Claude (MCP, Claude Code, Agent SDK,
 * API, automation) on top of that trend — high-impact content to attract clients
 * for Juko (an agency selling AI agents, automation and software).
 *
 * Reasons only over the provided trend/evidence; flat, CLI-friendly schema.
 */
import { z } from "zod";
import { BaseAgent } from "@/server/services/ai/agents/base";

export type ClaudeAngleInput = {
  trend: { title: string; summary: string | null };
  evidence: string[]; // real signal headlines backing the trend
};

export const ClaudeAngleOutputSchema = z.object({
  kinds: z.array(z.string()).describe("'video' o 'proyecto' por idea"),
  titles: z.array(z.string()).describe("título llamativo de cada idea"),
  hooks: z.array(z.string()).describe("gancho/idea central (para video: los primeros segundos)"),
  claudeImpls: z.array(z.string()).describe("CÓMO se implementa Claude: MCP, Claude Code, Agent SDK, API, automatización"),
  combos: z.array(z.string()).describe("qué herramienta/tema del trend se combina con Claude"),
  platforms: z.array(z.string()).describe("tiktok | instagram | youtube | facebook (para video; '-' si es proyecto)"),
  stepsCsv: z.array(z.string()).describe("pasos/guion separados por ' | '"),
  impacts: z.array(z.string()).describe("por qué causaría impacto y atraería clientes"),
  difficulties: z.array(z.string()).describe("baja | media | alta"),
});
export type ClaudeAngleOutput = z.infer<typeof ClaudeAngleOutputSchema>;

export class ClaudeAngleAgent extends BaseAgent<ClaudeAngleInput, ClaudeAngleOutput> {
  readonly kind = "claude_angle" as const;
  readonly operation = "claude_angle";
  readonly schema = ClaudeAngleOutputSchema;
  protected maxTokens = 3200;
  readonly system = [
    "Eres director creativo y technologist de Juko, una agencia que vende agentes de IA, automatización y software.",
    "Tu especialidad es CLAUDE (Anthropic): MCP, Claude Code, Agent SDK, la API y automatizaciones con Claude.",
    "Dada una TENDENCIA real (una herramienta o tema en auge) y su evidencia, genera ideas para crear contenido",
    "de redes sociales y proyectos demostrables que IMPLEMENTEN Claude combinado con esa tendencia.",
    "Cada idea debe ser concreta, accionable y de alto impacto para atraer clientes que quieran agentes/automatización/software.",
    "Mezcla ideas de 'video' (para TikTok/Reels/YouTube/Facebook) y de 'proyecto' (algo que se pueda construir y mostrar:",
    "un MCP, un agente, una automatización). Sé específico sobre cómo entra Claude (MCP, Claude Code, Agent SDK, API).",
    "No inventes métricas ni funciones que no existan; básate en la tendencia dada. Devuelve 5-8 ideas en arrays alineados por índice.",
    "Responde en español.",
  ].join(" ");

  buildUser(input: ClaudeAngleInput): string {
    return [
      `TENDENCIA EN AUGE: ${input.trend.title}`,
      input.trend.summary ? `Contexto: ${input.trend.summary}` : "",
      "",
      "Evidencia real (titulares que respaldan la tendencia):",
      ...input.evidence.slice(0, 12).map((e) => `- ${e}`),
      "",
      "Genera 5-8 ideas 'trend × Claude' (mezcla videos y proyectos), arrays alineados por índice.",
      "Piensa: ¿cómo hago un video o proyecto TOP combinando esta tendencia con Claude (MCP/Claude Code/Agent SDK/API)?",
    ].filter(Boolean).join("\n");
  }
}

export const claudeAngleAgent = new ClaudeAngleAgent();
