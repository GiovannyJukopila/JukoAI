/**
 * Business categories used to drive Places searches and the coverage ledger.
 *
 * `query` is the term sent to Google Places Text Search (combined with the zone),
 * `label` is shown in the dashboard. Country-agnostic on purpose.
 *
 * `variants` are extra search terms used in "thorough" mode: Google Places caps a
 * single text search at 60 results, so running several related terms and deduping
 * by place_id surfaces many more unique businesses in the same zone.
 */
export type BusinessCategory = {
  id: string;
  label: string;
  query: string;
  variants?: string[];
  /** Categories where lacking e-commerce is a strong opportunity signal. */
  expectsEcommerce?: boolean;
};

export const CATEGORIES: BusinessCategory[] = [
  {
    id: "restaurants",
    label: "Restaurantes",
    query: "restaurant",
    variants: ["fine dining restaurant", "italian restaurant", "seafood restaurant", "pizzeria", "bistro", "tapas bar", "steakhouse", "asian restaurant"],
  },
  {
    id: "hotels",
    label: "Hoteles",
    query: "hotel",
    variants: ["boutique hotel", "resort", "guest house", "bed and breakfast", "aparthotel", "luxury hotel", "budget hotel"],
  },
  {
    id: "retail",
    label: "Retail / Tiendas",
    query: "shop",
    variants: ["store", "boutique", "gift shop", "souvenir shop", "convenience store"],
    expectsEcommerce: true,
  },
  {
    id: "real_estate",
    label: "Inmobiliarias",
    query: "real estate agency",
    variants: ["property agency", "estate agent", "letting agency"],
  },
  {
    id: "beauty",
    label: "Belleza / Peluquerías",
    query: "beauty salon",
    variants: ["hair salon", "barber shop", "nail salon", "spa", "aesthetic clinic"],
  },
  {
    id: "gyms",
    label: "Gimnasios",
    query: "gym",
    variants: ["fitness center", "crossfit box", "yoga studio", "pilates studio"],
  },
  {
    id: "clinics",
    label: "Clínicas / Dental",
    query: "clinic",
    variants: ["dental clinic", "medical clinic", "physiotherapy clinic", "aesthetic clinic", "veterinary clinic"],
  },
  {
    id: "lawyers",
    label: "Abogados",
    query: "law firm",
    variants: ["lawyer", "legal services", "notary"],
  },
  {
    id: "cafes",
    label: "Cafeterías",
    query: "cafe",
    variants: ["coffee shop", "bakery cafe", "brunch cafe", "tea house"],
  },
  {
    id: "bars",
    label: "Bares",
    query: "bar",
    variants: ["cocktail bar", "wine bar", "pub", "lounge bar", "nightclub"],
  },
  {
    id: "car_dealers",
    label: "Concesionarios",
    query: "car dealer",
    variants: ["used car dealer", "car rental", "auto repair shop"],
  },
  {
    id: "fashion",
    label: "Moda / Ropa",
    query: "clothing store",
    variants: ["fashion boutique", "shoe store", "jewelry store", "accessories shop"],
    expectsEcommerce: true,
  },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): BusinessCategory | undefined {
  return byId.get(id);
}

/** Accepts a known category id or a free-text query (for ad-hoc searches). */
export function resolveCategoryQuery(idOrQuery: string): string {
  return byId.get(idOrQuery)?.query ?? idOrQuery;
}

/**
 * All search terms for a category (main + variants), deduped. Used by thorough
 * mode to exceed the 60-result-per-query cap. Free-text input returns just itself.
 */
export function resolveCategoryTerms(idOrQuery: string): string[] {
  const cat = byId.get(idOrQuery);
  if (!cat) return [idOrQuery];
  return [...new Set([cat.query, ...(cat.variants ?? [])])];
}
