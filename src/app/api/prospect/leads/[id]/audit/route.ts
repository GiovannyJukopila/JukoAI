import type { NextRequest } from "next/server";
import { auditBusiness } from "@/server/services/audit/runner";
import { ok, badRequest, handleError, parseId, featureDisabled } from "@/server/lib/api";
import { ENABLE_BUSINESS_AUDIT } from "@/config/features";

export const dynamic = "force-dynamic";
// PageSpeed runs can be slow (mobile + desktop Lighthouse).
export const maxDuration = 180;

/** POST /api/prospect/leads/:id/audit → run (or re-run) the audit for one lead. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!ENABLE_BUSINESS_AUDIT) return featureDisabled("ENABLE_BUSINESS_AUDIT");
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const outcome = await auditBusiness(num);
    return ok(outcome);
  } catch (err) {
    return handleError(err);
  }
}
