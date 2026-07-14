/**
 * Scrape orchestrator: ties Section 0 (coverage control) to the Places client and
 * the leads repository. The unit of work is ALWAYS (zone × category).
 *
 * Flow:
 *   1. evaluateCoverage → maybe skip (recent) / refuse (in progress) without spending quota
 *   2. markCoverageInProgress
 *   3. paginate Places Text Search, upserting each business (dedup by place_id)
 *   4. recordCoverageResult (completada / completada_parcial / error) + log api_usage
 */
import { searchTextPages, type PlaceResult } from "@/server/services/places/client";
import { upsertBusiness, type BusinessUpsert } from "@/server/services/leads/repository";
import {
  evaluateCoverage,
  markCoverageInProgress,
  recordCoverageResult,
  type CoverageDecision,
} from "@/server/services/coverage/service";
import { resolveCategoryQuery, resolveCategoryTerms } from "@/server/config/categories";
import { logApiUsage, COST } from "@/server/services/usage/tracker";
import { ExternalApiError, RateLimitError } from "@/server/lib/errors";

/** Minimal country → ISO 3166-1 alpha-2 map for region biasing. Extend as needed. */
const REGION_CODES: Record<string, string> = {
  malta: "MT",
  méxico: "MX",
  mexico: "MX",
  españa: "ES",
  espana: "ES",
  spain: "ES",
  "united states": "US",
  usa: "US",
  italia: "IT",
  italy: "IT",
  portugal: "PT",
  francia: "FR",
  france: "FR",
  irlanda: "IE",
  ireland: "IE",
  "países bajos": "NL",
  "paises bajos": "NL",
  holanda: "NL",
  netherlands: "NL",
  alemania: "DE",
  germany: "DE",
  suiza: "CH",
  switzerland: "CH",
  bélgica: "BE",
  belgica: "BE",
  belgium: "BE",
  colombia: "CO",
};

function regionCodeFor(country: string): string | undefined {
  return REGION_CODES[country.trim().toLowerCase()];
}

/** Map a Places (New) result to our businesses upsert shape. */
export function normalizePlace(
  place: PlaceResult,
  ctx: { country: string; category: string; zoneId: number },
): BusinessUpsert | null {
  if (!place.id) return null;
  return {
    placeId: place.id,
    name: place.displayName?.text ?? "(sin nombre)",
    category: ctx.category,
    address: place.formattedAddress ?? null,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    phone: place.nationalPhoneNumber ?? null,
    internationalPhone: place.internationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    rating: place.rating ?? null,
    reviewsCount: place.userRatingCount ?? null,
    businessStatus: place.businessStatus ?? null,
    googleTypes: place.types ?? (place.primaryType ? [place.primaryType] : null),
    country: ctx.country,
    zoneId: ctx.zoneId,
    raw: place,
  };
}

export type ScrapeSummary = {
  ran: boolean;
  decision: CoverageDecision;
  created: number;
  updated: number;
  total: number;
  apiCalls: number;
  status: "completada" | "completada_parcial" | "error" | "skipped";
  error?: string;
};

export type ScrapeInput = {
  country: string;
  zone: string;
  category: string; // category id or free-text query
  city?: string | null; // city the zone belongs to (barrios); omit for leaf localities
  force?: boolean;
  maxPages?: number;
  /** Run all category variants (many more unique results, more API cost). */
  thorough?: boolean;
};

/**
 * Scrape one (zone × category). Honors Section 0: returns early without spending
 * quota when the unit was evaluated recently (unless `force`).
 */
export async function scrapeZoneCategory(input: ScrapeInput): Promise<ScrapeSummary> {
  const decision = await evaluateCoverage(
    { country: input.country, zone: input.zone, category: input.category, city: input.city },
    { force: input.force },
  );

  // Don't spend quota when the unit is fresh or already running.
  if (decision.action === "skip_recent" || decision.action === "in_progress") {
    return {
      ran: false,
      decision,
      created: 0,
      updated: 0,
      total: 0,
      apiCalls: 0,
      status: "skipped",
    };
  }

  const zoneId = decision.zone.id;
  await markCoverageInProgress(zoneId, input.category);

  // Single term normally; in thorough mode, every category variant (each capped at
  // ~60 by Google) — deduped by place_id via upsert, so together they exceed 60.
  const terms = input.thorough
    ? resolveCategoryTerms(input.category)
    : [resolveCategoryQuery(input.category)];
  const regionCode = regionCodeFor(input.country);

  let created = 0;
  let updated = 0;
  let apiCalls = 0;
  let pageError: string | undefined;

  // For barrios, disambiguate with the city ("Chapinero, Bogotá") — otherwise just the zone.
  const place =
    input.city?.trim() && input.city.trim() !== input.zone
      ? `${input.zone}, ${input.city.trim()}`
      : input.zone;

  for (const term of terms) {
    const textQuery = `${term} in ${place}, ${input.country}`;
    try {
      for await (const { places } of searchTextPages(textQuery, {
        regionCode,
        maxPages: input.maxPages ?? 3,
      })) {
        apiCalls += 1;
        await logApiUsage({
          provider: "google_places",
          operation: "textSearch",
          requestCount: 1,
          costUsd: COST.placesTextSearch,
        });

        for (const place of places) {
          const norm = normalizePlace(place, {
            country: input.country,
            category: input.category,
            zoneId,
          });
          if (!norm) continue;
          const { created: isNew } = await upsertBusiness(norm);
          if (isNew) created += 1;
          else updated += 1;
        }
      }
    } catch (err) {
      pageError =
        err instanceof RateLimitError
          ? "Cuota de Places excedida (429). Reintenta más tarde."
          : err instanceof ExternalApiError
            ? err.message
            : (err as Error).message;
      // On quota exhaustion stop entirely; on other errors try the next variant.
      if (err instanceof RateLimitError) break;
    }
  }

  const total = created + updated;
  let status: ScrapeSummary["status"];
  if (pageError && total === 0) status = "error";
  else if (pageError) status = "completada_parcial";
  else status = "completada";

  await recordCoverageResult(zoneId, input.category, {
    status,
    resultsCount: total,
    apiCallsUsed: apiCalls,
    errorMessage: pageError ?? null,
  });

  return {
    ran: true,
    decision,
    created,
    updated,
    total,
    apiCalls,
    status,
    error: pageError,
  };
}
