/**
 * Google Places API (New) client — Text Search with a field mask.
 *
 * We use the *New* Places API (`places:searchText`) rather than the legacy
 * Text Search + Place Details pair, because a single searchText call returns
 * contact + atmosphere fields (phone, website, rating, reviews) via the field
 * mask. That means fewer requests and lower cost per business than the legacy
 * two-step flow.
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 */
import { env, requireKey } from "@/server/config/env";
import { ENABLE_BUSINESS_AUDIT } from "@/config/features";
import { fetchJson, RateLimiter } from "@/server/lib/http";
import { ExternalApiError, RateLimitError } from "@/server/lib/errors";

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Fields we want back. Includes Pro (contact) + Enterprise (rating) tiers.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.primaryType",
  "places.types",
  "places.businessStatus",
  "nextPageToken",
].join(",");

// Conservative client-side throttle: Places New allows high QPS, but we keep a
// gentle pace to avoid bursts that trip per-minute quotas.
const limiter = new RateLimiter(250);

export type PlaceResult = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  types?: string[];
  businessStatus?: string;
};

type SearchResponse = {
  places?: PlaceResult[];
  nextPageToken?: string;
};

export type SearchTextOptions = {
  pageToken?: string;
  /** ISO 3166-1 alpha-2 (e.g. "MT", "MX"). Biases results to the country. */
  regionCode?: string;
  languageCode?: string;
  pageSize?: number;
};

/** One Text Search request (one page, up to 20 results). */
export async function searchTextPage(
  textQuery: string,
  opts: SearchTextOptions = {},
): Promise<SearchResponse> {
  if (!ENABLE_BUSINESS_AUDIT) {
    throw new Error(
      "Google Places bloqueado: ENABLE_BUSINESS_AUDIT está apagado (control de costos, src/config/features.ts).",
    );
  }
  const key = requireKey(env.GOOGLE_MAPS_API_KEY, "GOOGLE_MAPS_API_KEY");
  await limiter.wait();

  const body: Record<string, unknown> = {
    textQuery,
    pageSize: opts.pageSize ?? 20,
    languageCode: opts.languageCode ?? "en",
  };
  if (opts.regionCode) body.regionCode = opts.regionCode;
  if (opts.pageToken) body.pageToken = opts.pageToken;

  try {
    return await fetchJson<SearchResponse>(SEARCH_URL, {
      provider: "google_places",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
      timeoutMs: 20000,
      retries: 3,
    });
  } catch (err) {
    // Surface Google's quota signal distinctly so the runner can stop early.
    if (err instanceof RateLimitError) throw err;
    if (err instanceof ExternalApiError && err.status === 403) {
      throw new ExternalApiError(
        "Places API rejected the request (403). Check the key is valid and the " +
          "'Places API (New)' is enabled in Google Cloud Console.",
        "google_places",
        403,
        false,
      );
    }
    throw err;
  }
}

/**
 * Iterate all pages for a query, up to `maxPages` (default 3 → ~60 results).
 * The New API's nextPageToken is usually immediately usable; we still allow a
 * brief settle delay between pages. Yields each page so the caller can persist
 * incrementally and track partial progress on failure.
 */
export async function* searchTextPages(
  textQuery: string,
  opts: SearchTextOptions & { maxPages?: number } = {},
): AsyncGenerator<{ page: number; places: PlaceResult[] }, void, unknown> {
  const maxPages = opts.maxPages ?? 3;
  let pageToken: string | undefined = opts.pageToken;
  let page = 0;

  do {
    const res: SearchResponse = await searchTextPage(textQuery, { ...opts, pageToken });
    page += 1;
    yield { page, places: res.places ?? [] };
    pageToken = res.nextPageToken;
    if (pageToken && page < maxPages) {
      // small settle delay before requesting the next page token
      await new Promise((r) => setTimeout(r, 800));
    }
  } while (pageToken && page < maxPages);
}
