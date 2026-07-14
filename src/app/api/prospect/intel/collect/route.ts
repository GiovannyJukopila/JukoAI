import type { NextRequest } from "next/server";
import { runCollect } from "@/server/services/intel/collect";
import { runSynthesize } from "@/server/services/intel/synthesize";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";
// Collection + (optional AI) synthesis can take a while (claude -p is a subprocess).
export const maxDuration = 300;

/**
 * POST /api/prospect/intel/collect  { ai?: boolean }
 * Runs a full collection pass over enabled sources, then synthesizes trends.
 * ai=true routes clustering through the trend_synthesis agent (with a deterministic
 * fallback); default is the deterministic clusterer for a fast, reliable result.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const collect = await runCollect();
    const synth = await runSynthesize({ useAi: body?.ai === true });
    return ok({ collect, synth });
  } catch (err) {
    return handleError(err);
  }
}
