import type { NextRequest } from "next/server";
import { zoneAuditProgress } from "@/server/services/audit/batch";
import { ok, badRequest, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/audit-progress?zoneId=N → per-category {total, audited}. */
export async function GET(req: NextRequest) {
  try {
    const zoneId = Number(req.nextUrl.searchParams.get("zoneId"));
    if (!Number.isInteger(zoneId) || zoneId <= 0) return badRequest("zoneId inválido");
    const rows = await zoneAuditProgress(zoneId);
    return ok({
      progress: rows.map((r) => ({
        category: r.category,
        total: Number(r.total),
        audited: Number(r.audited),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
