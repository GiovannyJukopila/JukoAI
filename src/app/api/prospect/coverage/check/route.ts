import type { NextRequest } from "next/server";
import { evaluateCoverage } from "@/server/services/coverage/service";
import { ok, badRequest, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/prospect/coverage/check?country=&zone=&category=
 * Previews the Section-0 decision WITHOUT spending Places quota, so the UI can
 * warn before launching a scrape on a recently-evaluated zone.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const country = sp.get("country");
    const zone = sp.get("zone");
    const category = sp.get("category");
    if (!country || !zone || !category) {
      return badRequest("Faltan country, zone o category");
    }
    const decision = await evaluateCoverage({ country, zone, category });
    return ok({
      action: decision.action,
      reason: decision.reason,
      message: decision.message,
      coverage: decision.coverage,
    });
  } catch (err) {
    return handleError(err);
  }
}
