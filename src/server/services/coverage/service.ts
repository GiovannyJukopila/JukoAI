/**
 * Section 0 — Geographic zone control (the heart of the system).
 *
 * The unit of work is ALWAYS (zone × category), never a whole country at once.
 * Before any scrape we consult the `coverage` ledger and decide what to do, so we
 * never burn Places API quota on a zone+category already covered recently.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { cities, zones, coverage, businesses as businessesTbl } from "@/server/db/schema";
import type { CoverageStatus } from "@/server/db/schema";
import { env } from "@/server/config/env";

export type CoverageDecisionAction =
  | "run" // no record, or pendiente, or forced → execute the scrape
  | "skip_recent" // completed within the refresh window → don't spend quota
  | "offer_refresh" // stale / partial / error → suggest refreshing
  | "in_progress"; // a scrape for this unit is already running

export type CoverageDecision = {
  action: CoverageDecisionAction;
  reason: string;
  message: string;
  zone: typeof zones.$inferSelect;
  coverage: typeof coverage.$inferSelect | null;
};

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "—";
}

/** Idempotently get or create a city by (country, name). */
export async function ensureCity(
  country: string,
  name: string,
  planned = true,
): Promise<typeof cities.$inferSelect> {
  const existing = await db
    .select()
    .from(cities)
    .where(and(eq(cities.country, country), eq(cities.name, name)))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(cities)
    .values({ country, name, planned })
    .onConflictDoNothing({ target: [cities.country, cities.name] })
    .returning();
  if (created) return created;

  const [row] = await db
    .select()
    .from(cities)
    .where(and(eq(cities.country, country), eq(cities.name, name)))
    .limit(1);
  return row;
}

/**
 * Idempotently get or create a zone. Every zone belongs to a city:
 *  - `city` given → the city is ensured and the zone created under it (barrio).
 *  - `city` omitted → if a zone with this name already exists in the country, reuse
 *    it; otherwise create a leaf city named after the zone (Malta-style locality).
 */
export async function ensureZone(input: {
  country: string;
  name: string;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  planned?: boolean;
}): Promise<typeof zones.$inferSelect> {
  // No explicit city → try to reuse an existing zone by (country, name).
  if (!input.city?.trim()) {
    const byName = await db
      .select()
      .from(zones)
      .where(and(eq(zones.country, input.country), eq(zones.name, input.name)))
      .limit(2);
    if (byName.length === 1) return byName[0];
  }

  const cityName = input.city?.trim() || input.name;
  const city = await ensureCity(input.country, cityName, input.planned ?? true);

  const existing = await db
    .select()
    .from(zones)
    .where(and(eq(zones.cityId, city.id), eq(zones.name, input.name)))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(zones)
    .values({
      country: input.country,
      cityId: city.id,
      name: input.name,
      displayName:
        cityName === input.name
          ? `${input.name}, ${input.country}`
          : `${input.name}, ${cityName}, ${input.country}`,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      planned: input.planned ?? true,
    })
    .onConflictDoNothing({ target: [zones.cityId, zones.name] })
    .returning();

  // onConflictDoNothing returns nothing on race → re-read.
  if (created) return created;
  const [row] = await db
    .select()
    .from(zones)
    .where(and(eq(zones.cityId, city.id), eq(zones.name, input.name)))
    .limit(1);
  return row;
}

async function getCoverageRow(zoneId: number, category: string) {
  const [row] = await db
    .select()
    .from(coverage)
    .where(and(eq(coverage.zoneId, zoneId), eq(coverage.category, category)))
    .limit(1);
  return row ?? null;
}

/**
 * Decide whether to scrape (zone × category). Ensures the zone exists.
 * Pass `force: true` to override a recent/stale record and run anyway.
 */
export async function evaluateCoverage(
  input: { country: string; zone: string; category: string; city?: string | null },
  opts: { force?: boolean } = {},
): Promise<CoverageDecision> {
  const zone = await ensureZone({
    country: input.country,
    name: input.zone,
    city: input.city ?? null,
  });
  const row = await getCoverageRow(zone.id, input.category);
  const where = `${input.zone}, ${input.country} · ${input.category}`;

  if (!row) {
    return {
      action: "run",
      reason: "nueva",
      message: `Zona nueva: «${where}». Se ejecutará y se creará su registro.`,
      zone,
      coverage: null,
    };
  }

  if (row.status === "en_progreso" && !opts.force) {
    return {
      action: "in_progress",
      reason: "en_progreso",
      message: `«${where}» ya está en progreso (iniciada ${fmtDate(row.lastRunAt)}).`,
      zone,
      coverage: row,
    };
  }

  if (opts.force) {
    return {
      action: "run",
      reason: "forzado",
      message: `Refresco forzado de «${where}».`,
      zone,
      coverage: row,
    };
  }

  if (row.status === "pendiente") {
    return {
      action: "run",
      reason: "pendiente",
      message: `«${where}» estaba pendiente. Se ejecutará.`,
      zone,
      coverage: row,
    };
  }

  if (row.status === "completada" || row.status === "completada_parcial") {
    const now = Date.now();
    const fresh = row.nextRefreshAt && now < new Date(row.nextRefreshAt).getTime();
    if (fresh) {
      return {
        action: "skip_recent",
        reason: "reciente",
        message:
          `«${where}» ya fue evaluada el ${fmtDate(row.lastRunAt)}, ` +
          `tiene ${row.resultsCount} negocios registrados. ` +
          `Refresco recomendado a partir del ${fmtDate(row.nextRefreshAt)}. ` +
          `Puedes forzar un refresco igualmente.`,
        zone,
        coverage: row,
      };
    }
    return {
      action: "offer_refresh",
      reason: "antigua",
      message:
        `«${where}» se evaluó el ${fmtDate(row.lastRunAt)} (${row.resultsCount} negocios) ` +
        `y ya pasó su periodo de refresco. ¿Refrescar?`,
      zone,
      coverage: row,
    };
  }

  // status === "error"
  return {
    action: "offer_refresh",
    reason: "error_previo",
    message: `«${where}» falló en su último intento (${row.errorMessage ?? "error"}). ¿Reintentar?`,
    zone,
    coverage: row,
  };
}

/** Mark a (zone × category) unit as running. Creates the row if absent. */
export async function markCoverageInProgress(
  zoneId: number,
  category: string,
): Promise<typeof coverage.$inferSelect> {
  const refreshDays = env.DEFAULT_REFRESH_DAYS;
  const [row] = await db
    .insert(coverage)
    .values({
      zoneId,
      category,
      status: "en_progreso",
      refreshIntervalDays: refreshDays,
      lastRunAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [coverage.zoneId, coverage.category],
      set: { status: "en_progreso", lastRunAt: new Date(), updatedAt: new Date() },
    })
    .returning();
  return row;
}

/** Persist the outcome of a scrape and compute the next recommended refresh date. */
export async function recordCoverageResult(
  zoneId: number,
  category: string,
  result: {
    status: CoverageStatus;
    resultsCount: number;
    apiCallsUsed: number;
    errorMessage?: string | null;
  },
): Promise<typeof coverage.$inferSelect> {
  const refreshDays = env.DEFAULT_REFRESH_DAYS;
  const now = new Date();
  const nextRefresh = new Date(now.getTime() + refreshDays * 86_400_000);

  const [row] = await db
    .insert(coverage)
    .values({
      zoneId,
      category,
      status: result.status,
      resultsCount: result.resultsCount,
      apiCallsUsed: result.apiCallsUsed,
      refreshIntervalDays: refreshDays,
      errorMessage: result.errorMessage ?? null,
      lastRunAt: now,
      nextRefreshAt: nextRefresh,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [coverage.zoneId, coverage.category],
      set: {
        status: result.status,
        // accumulate counts/calls across refreshes
        resultsCount: result.resultsCount,
        apiCallsUsed: sql`${coverage.apiCallsUsed} + ${result.apiCallsUsed}`,
        errorMessage: result.errorMessage ?? null,
        lastRunAt: now,
        nextRefreshAt: nextRefresh,
        updatedAt: now,
      },
    })
    .returning();
  return row;
}

/**
 * Full coverage ledger joined with zone info, for the dashboard table.
 * Includes real audit progress per (zone × category) — total businesses and how
 * many are audited — computed in ONE grouped query so the dashboard never needs
 * per-zone follow-up requests (this used to be an N+1).
 */
export async function listCoverage() {
  const [rows, auditRows] = await Promise.all([
    db
      .select({
        id: coverage.id,
        country: zones.country,
        city: cities.name,
        zone: zones.name,
        zoneId: zones.id,
        category: coverage.category,
        status: coverage.status,
        lastRunAt: coverage.lastRunAt,
        resultsCount: coverage.resultsCount,
        nextRefreshAt: coverage.nextRefreshAt,
        apiCallsUsed: coverage.apiCallsUsed,
        errorMessage: coverage.errorMessage,
      })
      .from(coverage)
      .innerJoin(zones, eq(coverage.zoneId, zones.id))
      .innerJoin(cities, eq(zones.cityId, cities.id))
      .orderBy(zones.country, cities.name, zones.name, coverage.category),
    db
      .select({
        zoneId: businessesTbl.zoneId,
        category: businessesTbl.category,
        total: sql<number>`count(*)`,
        audited: sql<number>`count(*) filter (where ${businessesTbl.auditStatus} <> 'none')`,
      })
      .from(businessesTbl)
      .where(sql`${businessesTbl.zoneId} is not null and ${businessesTbl.category} is not null`)
      .groupBy(businessesTbl.zoneId, businessesTbl.category),
  ]);

  const auditByKey = new Map(
    auditRows.map((a) => [`${a.zoneId}:${a.category}`, { total: Number(a.total), audited: Number(a.audited) }]),
  );

  const now = Date.now();
  return rows.map((r) => {
    const a = auditByKey.get(`${r.zoneId}:${r.category}`);
    return {
      ...r,
      bizTotal: a?.total ?? 0,
      bizAudited: a?.audited ?? 0,
      needsRefresh:
        (r.status === "completada" || r.status === "completada_parcial") &&
        !!r.nextRefreshAt &&
        now >= new Date(r.nextRefreshAt).getTime(),
    };
  });
}

/**
 * Aggregated progress per country: "Malta: 5 de 8 zonas".
 * A zone counts as covered when it has at least one `completada`/`completada_parcial`
 * coverage row. Denominator = planned zones for that country.
 */
export async function getCountryProgress() {
  const plannedRows = await db
    .select({ country: zones.country, total: sql<number>`count(*)` })
    .from(zones)
    .where(eq(zones.planned, true))
    .groupBy(zones.country);

  const coveredRows = await db
    .select({
      country: zones.country,
      covered: sql<number>`count(distinct ${zones.id})`,
    })
    .from(zones)
    .innerJoin(coverage, eq(coverage.zoneId, zones.id))
    .where(sql`${coverage.status} in ('completada','completada_parcial')`)
    .groupBy(zones.country);

  const coveredMap = new Map(coveredRows.map((r) => [r.country, Number(r.covered)]));
  return plannedRows
    .map((r) => ({
      country: r.country,
      covered: coveredMap.get(r.country) ?? 0,
      planned: Number(r.total),
    }))
    .sort((a, b) => a.country.localeCompare(b.country));
}

/** Zone catalog (country → city → zone) for the launcher and filter dropdowns. */
export async function listZones() {
  return db
    .select({ id: zones.id, country: zones.country, cityId: zones.cityId, city: cities.name, name: zones.name })
    .from(zones)
    .innerJoin(cities, eq(zones.cityId, cities.id))
    .orderBy(zones.country, cities.name, zones.name);
}

/** City catalog (country → city) for filter dropdowns. */
export async function listCities() {
  return db
    .select({ id: cities.id, country: cities.country, name: cities.name })
    .from(cities)
    .orderBy(cities.country, cities.name);
}

/** Recent coverage activity (for diagnostics / dashboard secondary views). */
export async function recentCoverage(limit = 20) {
  return db
    .select()
    .from(coverage)
    .orderBy(desc(coverage.updatedAt))
    .limit(limit);
}
