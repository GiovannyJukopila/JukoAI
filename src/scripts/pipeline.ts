/**
 * CLI entrypoint for the Phase 2 agent pipeline (Research → Audit/SEO → Copywriting).
 *
 * Usage:
 *   npm run pipeline -- --id 3                  # one lead
 *   npm run pipeline -- --minScore 40 --limit 5 # batch over high-opportunity leads
 *
 * Uses the configured AI provider (default: Claude Pro subscription via the CLI backend).
 */
import "@/server/config/load-env";
import { and, gte, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { businesses } from "@/server/db/schema";
import { runPipeline } from "@/server/services/ai/orchestrator";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const idArg = arg("id");
  const minScore = arg("minScore") ? Number(arg("minScore")) : undefined;
  const limit = arg("limit") ? Number(arg("limit")) : undefined;
  const senderName = arg("sender");

  let ids: number[];
  if (idArg) {
    ids = [Number(idArg)];
  } else {
    const rows = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(typeof minScore === "number" ? and(gte(businesses.opportunityScore, minScore)) : undefined)
      .orderBy(sql`${businesses.opportunityScore} desc nulls last`)
      .limit(limit ?? 5);
    ids = rows.map((r) => r.id);
  }

  if (ids.length === 0) {
    console.log("No hay leads que procesar.");
    process.exit(0);
  }

  console.log(`Procesando pipeline para ${ids.length} lead(s)…`);
  let total = 0;
  for (const id of ids) {
    const r = await runPipeline(id, { senderName });
    total += r.totalCostUsd;
    const stepStr = r.steps.map((s) => `${s.agent}:${s.ok ? "✅" : "❌"}`).join(" ");
    console.log(`  #${id} → ${r.status} · ${stepStr} · $${r.totalCostUsd.toFixed(4)} (run ${r.runId})`);
  }
  console.log(`\nCoste total estimado: $${total.toFixed(4)}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Pipeline falló:", e?.message || e);
  process.exit(1);
});
