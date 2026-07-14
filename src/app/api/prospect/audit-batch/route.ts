import type { NextRequest } from "next/server";
import { auditZoneCategoryBatch } from "@/server/services/audit/batch";
import { ok, badRequest, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";
// A small batch of PageSpeed audits can take a minute or two.
export const maxDuration = 300;

/**
 * POST /api/prospect/audit-batch  { zoneId, category, limit? }
 * Audits up to `limit` (default 3) pending businesses in the zone×category.
 * The client calls this repeatedly until `remaining` is 0, driving a progress bar.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const zoneId = Number(body?.zoneId);
    const category = body?.category;
    if (!Number.isInteger(zoneId) || zoneId <= 0 || !category) {
      return badRequest("Faltan zoneId o category");
    }
    const limit = Math.min(Math.max(Number(body?.limit) || 3, 1), 5);
    return ok(await auditZoneCategoryBatch(zoneId, category, limit));
  } catch (err) {
    return handleError(err);
  }
}
