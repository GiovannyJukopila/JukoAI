import type { NextRequest } from "next/server";
import { listOpportunities, opportunityCountByStatus } from "@/server/services/intel/repository";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/intel/opportunities?businessId=&status= → opportunity queue. */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const businessId = sp.get("businessId") ? Number(sp.get("businessId")) : undefined;
    const status = sp.get("status") || undefined;
    const [items, byStatus] = await Promise.all([
      listOpportunities({ businessId, status }),
      opportunityCountByStatus(),
    ]);
    return ok({ opportunities: items, byStatus });
  } catch (err) {
    return handleError(err);
  }
}
