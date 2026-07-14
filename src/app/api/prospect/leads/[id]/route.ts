import type { NextRequest } from "next/server";
import { getLeadDetail, setLeadStatus } from "@/server/services/leads/repository";
import { ok, badRequest, notFound, handleError, parseId } from "@/server/lib/api";
import { LEAD_STATUS, type LeadStatus } from "@/server/db/schema";

export const dynamic = "force-dynamic";

/** GET /api/prospect/leads/:id → business + latest audit + notes. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const detail = await getLeadDetail(num);
    if (!detail) return notFound("Lead no encontrado");
    return ok(detail);
  } catch (err) {
    return handleError(err);
  }
}

/** PATCH /api/prospect/leads/:id  Body: { leadStatus } → change pipeline state. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const body = await req.json().catch(() => null);
    const status = body?.leadStatus;
    if (!status || !(LEAD_STATUS as readonly string[]).includes(status)) {
      return badRequest(`leadStatus inválido. Usa uno de: ${LEAD_STATUS.join(", ")}`);
    }
    const row = await setLeadStatus(num, status as LeadStatus);
    if (!row) return notFound("Lead no encontrado");
    return ok(row);
  } catch (err) {
    return handleError(err);
  }
}
