/**
 * One-shot / cron entry for the Content Intelligence pipeline:
 *   collect (all enabled sources) → synthesize (cluster + score).
 *
 * Usage:  npx tsx src/scripts/intel-run.ts [--ai]
 * The --ai flag routes clustering through the trend_synthesis agent (claude -p);
 * without it, the deterministic clusterer runs (fast, always available).
 */
import "@/server/config/load-env";
import { runCollect } from "@/server/services/intel/collect";
import { runSynthesize } from "@/server/services/intel/synthesize";
import { pool } from "@/server/db/client";

async function main() {
  const useAi = process.argv.includes("--ai");
  const collect = await runCollect();
  console.log(`📥 collect: ${collect.inserted} new / ${collect.fetched} fetched from ${collect.sources} source(s)`);
  const synth = await runSynthesize({ useAi });
  console.log(`🧠 synthesize (${synth.strategy}): ${synth.trends} trends from ${synth.signals} signals`);
  await pool.end();
}

main().catch((e) => {
  console.error("❌ intel-run failed:", e);
  process.exit(1);
});
