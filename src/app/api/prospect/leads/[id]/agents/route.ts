import type { NextRequest } from "next/server";
import { getLeadAgentData } from "@/server/services/ai/repository";
import { ok, badRequest, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/leads/:id/agents → research, competitor, messages, agent tasks. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    return ok(await getLeadAgentData(num));
  } catch (err) {
    return handleError(err);
  }
}
