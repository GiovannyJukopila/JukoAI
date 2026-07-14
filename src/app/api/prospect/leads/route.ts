import type { NextRequest } from "next/server";
import { listLeads, leadFilterFacets, type LeadFilters } from "@/server/services/leads/repository";
import { ok, handleError } from "@/server/lib/api";
import { LEAD_STATUS, type LeadStatus } from "@/server/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/prospect/leads?country=&zoneId=&category=&minScore=&leadStatus=&limit=&offset=
 * Returns leads sorted by opportunity score (desc) + facets for the filter UI.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const filters: LeadFilters = {};
    if (sp.get("country")) filters.country = sp.get("country")!;
    if (sp.get("cityId")) filters.cityId = Number(sp.get("cityId"));
    if (sp.get("zoneId")) filters.zoneId = Number(sp.get("zoneId"));
    if (sp.get("category")) filters.category = sp.get("category")!;
    if (sp.get("minScore")) filters.minScore = Number(sp.get("minScore"));
    if (sp.get("unaudited") === "1") filters.unaudited = true;
    if (sp.get("q")) filters.q = sp.get("q")!;
    const ls = sp.get("leadStatus");
    if (ls && (LEAD_STATUS as readonly string[]).includes(ls)) {
      filters.leadStatus = ls as LeadStatus;
    }
    if (sp.get("limit")) filters.limit = Number(sp.get("limit"));
    if (sp.get("offset")) filters.offset = Number(sp.get("offset"));

    const [leads, facets] = await Promise.all([listLeads(filters), leadFilterFacets()]);
    return ok({ leads, facets });
  } catch (err) {
    return handleError(err);
  }
}
