import type { NextRequest } from "next/server";
import { getAnalytics } from "@/server/services/analytics/service";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/prospect/analytics?country=&cityId=&zoneId=
 * Aggregated stats for the dashboard charts, optionally scoped to a country,
 * city and/or zone for drill-down.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const country = sp.get("country") || null;
    const num = (key: string) => {
      const raw = sp.get(key);
      return raw && Number.isFinite(Number(raw)) ? Number(raw) : null;
    };
    return ok(await getAnalytics({ country, cityId: num("cityId"), zoneId: num("zoneId") }));
  } catch (err) {
    return handleError(err);
  }
}
