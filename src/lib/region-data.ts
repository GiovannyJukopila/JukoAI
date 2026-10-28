// Where a visitor is, for picking the WhatsApp number. Shared by the proxy (country from the host's
// geo header) and the browser (time zone), so it holds no "use client".

export type Region = "latam" | "intl";
export const REGION_COOKIE = "juko-region";

/** Latin America (ISO 3166-1 alpha-2). */
export const LATAM_COUNTRIES = new Set([
  "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC", "SV", "GT", "HN", "MX", "NI", "PA", "PY", "PE", "PR", "UY", "VE", "HT",
]);

// IANA time zones of those countries. "America/…" alone is not enough: it also covers the US and Canada.
const LATAM_ZONES = new Set([
  "America/Buenos_Aires", "America/Cordoba", "America/La_Paz", "America/Sao_Paulo", "America/Fortaleza", "America/Recife", "America/Bahia",
  "America/Belem", "America/Maceio", "America/Araguaina", "America/Manaus", "America/Cuiaba", "America/Campo_Grande", "America/Porto_Velho",
  "America/Boa_Vista", "America/Rio_Branco", "America/Eirunepe", "America/Santarem", "America/Noronha", "America/Santiago", "America/Punta_Arenas",
  "Pacific/Easter", "America/Bogota", "America/Costa_Rica", "America/Havana", "America/Santo_Domingo", "America/Guayaquil", "Pacific/Galapagos",
  "America/El_Salvador", "America/Guatemala", "America/Tegucigalpa", "America/Mexico_City", "America/Cancun", "America/Merida", "America/Monterrey",
  "America/Matamoros", "America/Chihuahua", "America/Ciudad_Juarez", "America/Ojinaga", "America/Mazatlan", "America/Bahia_Banderas",
  "America/Hermosillo", "America/Tijuana", "America/Managua", "America/Panama", "America/Asuncion", "America/Lima", "America/Puerto_Rico",
  "America/Montevideo", "America/Caracas", "America/Port-au-Prince",
]);

export function regionFromCountry(country: string): Region {
  return LATAM_COUNTRIES.has(country.toUpperCase()) ? "latam" : "intl";
}

export function regionFromTimeZone(tz: string): Region {
  return tz.startsWith("America/Argentina/") || LATAM_ZONES.has(tz) ? "latam" : "intl";
}
