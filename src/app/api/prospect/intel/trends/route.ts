import type { NextRequest } from "next/server";
import { listTrends, trendKpis, trendCountByStatus, lastIntelRun } from "@/server/services/intel/repository";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/intel/trends?status=&limit= → trend radar list + kpis. */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") || undefined;
    const limit = sp.get("limit") ? Number(sp.get("limit")) : undefined;
    const [items, kpis, byStatus, lastRun] = await Promise.all([
      listTrends({ status, limit }),
      trendKpis(),
      trendCountByStatus(),
      lastIntelRun(),
    ]);
    return ok({ trends: items, kpis, byStatus, lastRun });
  } catch (err) {
    return handleError(err);
  }
}
