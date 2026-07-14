import type { NextRequest } from "next/server";
import { scrapeZoneCategory } from "@/server/services/places/search";
import { ok, badRequest, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";
// Scraping can take a while (pagination + per-result upserts).
export const maxDuration = 120;

/**
 * POST /api/prospect/scrape
 * Body: { country, zone, category, force?, maxPages? }
 *
 * Honors Section 0: without `force`, a recently-evaluated zone returns
 * ran=false / action=skip_recent WITHOUT spending quota. The UI then offers
 * a "force refresh" which re-POSTs with force=true.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.country || !body?.zone || !body?.category) {
      return badRequest("Faltan country, zone o category");
    }
    const summary = await scrapeZoneCategory({
      country: String(body.country),
      zone: String(body.zone),
      category: String(body.category),
      city: body.city ? String(body.city) : null,
      force: Boolean(body.force),
      thorough: Boolean(body.thorough),
      maxPages: body.maxPages ? Number(body.maxPages) : undefined,
    });
    return ok(summary);
  } catch (err) {
    return handleError(err);
  }
}
