import { runOpportunities } from "@/server/services/intel/opportunities";
import { ok, badRequest, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";
// Two agent calls (business_match + creative_director) via claude -p.
export const maxDuration = 300;

/** POST /api/prospect/intel/leads/:id/opportunities → generate content opportunities for a lead. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const result = await runOpportunities(num);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
