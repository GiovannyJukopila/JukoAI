import type { NextRequest } from "next/server";
import { setOpportunityStatus } from "@/server/services/intel/repository";
import { OPPORTUNITY_STATUS, type OpportunityStatus } from "@/server/db/schema";
import { ok, badRequest, notFound, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** PATCH /api/prospect/intel/opportunities/:id  { status } → change opportunity status. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const body = await req.json().catch(() => ({}));
    const status = body?.status as string;
    if (!(OPPORTUNITY_STATUS as readonly string[]).includes(status)) return badRequest("status inválido");
    const row = await setOpportunityStatus(num, status as OpportunityStatus);
    if (!row) return notFound("Oportunidad no encontrada");
    return ok(row);
  } catch (err) {
    return handleError(err);
  }
}
