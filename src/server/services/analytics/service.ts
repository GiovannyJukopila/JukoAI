/**
 * Aggregated analytics for the dashboard charts. All aggregation happens in SQL
 * (fast, correct on large datasets) — the client only renders the result.
 *
 * Drill-down hierarchy: Global → country → city → zone. Everything except the
 * navigators (`byCountry`, `countryProgress`) is scoped to the current selection.
 * Businesses hang off zones, so city scope is expressed as "zone_id IN (city's zones)".
 */
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { ENABLED_COUNTRIES } from "@/config/features";

const n = (v: unknown) => Number(v ?? 0);

// SQL fragment `'Colombia', 'Malta'` for active-market IN() filters.
const enabledCountriesSql = sql.join(
  ENABLED_COUNTRIES.map((c) => sql`${c}`),
  sql`, `,
);

export type AnalyticsScopeInput = {
  country?: string | null;
  cityId?: number | null;
  zoneId?: number | null;
};

export async function getAnalytics(scope: AnalyticsScopeInput = {}) {
  const country = scope.country?.trim() || null;
  const cityId = scope.cityId != null && Number.isFinite(scope.cityId) ? scope.cityId : null;
  const zoneId = scope.zoneId != null && Number.isFinite(scope.zoneId) ? scope.zoneId : null;

  // Scope predicate over the `businesses` table (optionally aliased, e.g. "b").
  // `alias` is an internal constant — never user input — so sql.raw is safe here.
  const biz = (alias = ""): SQL => {
    const p = alias ? `${alias}.` : "";
    if (zoneId != null) return sql`${sql.raw(p)}zone_id = ${zoneId}`;
    if (cityId != null) return sql`${sql.raw(p)}zone_id IN (SELECT id FROM zones WHERE city_id = ${cityId})`;
    if (country) return sql`${sql.raw(p)}country = ${country}`;
    return sql`${sql.raw(p)}country IN (${enabledCountriesSql})`;
  };

  // ── Scoped KPIs (drive the summary row) ─────────────────────────────────────
  const [k] = (
    await db.execute(sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE audit_status <> 'none')::int AS audited,
        count(*) FILTER (WHERE opportunity_score >= 70)::int AS hot,
        coalesce(round(avg(opportunity_score) FILTER (WHERE audit_status <> 'none')), 0)::int AS avg_score,
        count(DISTINCT category) FILTER (WHERE category IS NOT NULL)::int AS sectors,
        count(DISTINCT zone_id) FILTER (WHERE zone_id IS NOT NULL)::int AS zones
      FROM businesses WHERE ${biz()}
    `)
  ).rows;
  const kpis = {
    total: n(k?.total), audited: n(k?.audited), hot: n(k?.hot),
    avgScore: n(k?.avg_score), sectors: n(k?.sectors), zones: n(k?.zones),
  };

  // Cities count within scope (for KPI): distinct cities among the scoped zones.
  const [kc] = (
    await db.execute(sql`
      SELECT count(DISTINCT z.city_id)::int AS cities
      FROM businesses b JOIN zones z ON z.id = b.zone_id
      WHERE ${biz("b")}
    `)
  ).rows;
  const cityCount = n(kc?.cities);

  // ── Country navigator (always global) ───────────────────────────────────────
  const byCountry = (
    await db.execute(sql`
      SELECT country,
        count(*)::int AS total,
        count(*) FILTER (WHERE audit_status <> 'none')::int AS audited,
        coalesce(round(avg(opportunity_score) FILTER (WHERE audit_status <> 'none')), 0)::int AS avg_score,
        count(*) FILTER (WHERE opportunity_score >= 70)::int AS hot
      FROM businesses WHERE country IN (${enabledCountriesSql})
      GROUP BY country ORDER BY total DESC
    `)
  ).rows.map((r) => ({ country: String(r.country), total: n(r.total), audited: n(r.audited), avgScore: n(r.avg_score), hot: n(r.hot) }));

  // ── City navigator (within the selected country) ────────────────────────────
  // Only meaningful once a country is chosen; empty at the global level.
  const byCity = country
    ? (
        await db.execute(sql`
          SELECT c.id AS city_id, c.name AS city,
            count(b.id)::int AS total,
            coalesce(round(avg(b.opportunity_score)), 0)::int AS avg_score
          FROM cities c JOIN zones z ON z.city_id = c.id JOIN businesses b ON b.zone_id = z.id
          WHERE c.country = ${country}
          GROUP BY c.id, c.name ORDER BY total DESC
        `)
      ).rows.map((r) => ({ cityId: n(r.city_id), city: String(r.city), total: n(r.total), avgScore: n(r.avg_score) }))
    : [];

  // ── Businesses by category / sector (scoped) ────────────────────────────────
  const byCategory = (
    await db.execute(sql`
      SELECT category, count(*)::int AS total,
        coalesce(round(avg(opportunity_score)), 0)::int AS avg_score
      FROM businesses WHERE category IS NOT NULL AND ${biz()}
      GROUP BY category ORDER BY total DESC
    `)
  ).rows.map((r) => ({ category: String(r.category), total: n(r.total), avgScore: n(r.avg_score) }));

  // ── Opportunity score distribution (scoped) ─────────────────────────────────
  const [sb] = (
    await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE opportunity_score >= 70)::int AS hot,
        count(*) FILTER (WHERE opportunity_score >= 45 AND opportunity_score < 70)::int AS warm,
        count(*) FILTER (WHERE opportunity_score >= 20 AND opportunity_score < 45)::int AS cool,
        count(*) FILTER (WHERE opportunity_score IS NOT NULL AND opportunity_score < 20)::int AS cold,
        count(*) FILTER (WHERE audit_status = 'none')::int AS unaudited
      FROM businesses WHERE ${biz()}
    `)
  ).rows;
  const scoreBuckets = { hot: n(sb?.hot), warm: n(sb?.warm), cool: n(sb?.cool), cold: n(sb?.cold), unaudited: n(sb?.unaudited) };

  // ── Zones (scoped): zones of the selected city, the single selected zone, or
  //    the global top 10. Carries cityId + zoneId so the client can drill in. ──
  const zoneWhere =
    zoneId != null ? sql`WHERE z.id = ${zoneId}`
    : cityId != null ? sql`WHERE z.city_id = ${cityId}`
    : country ? sql`WHERE z.country = ${country}`
    : sql`WHERE z.country IN (${enabledCountriesSql})`;
  const zoneLimit = country || cityId != null || zoneId != null ? sql`` : sql`LIMIT 10`;
  const topZones = (
    await db.execute(sql`
      SELECT z.id AS zone_id, z.city_id, z.name AS zone, z.country,
        count(b.id)::int AS total,
        coalesce(round(avg(b.opportunity_score)), 0)::int AS avg_score
      FROM zones z JOIN businesses b ON b.zone_id = z.id
      ${zoneWhere}
      GROUP BY z.id, z.city_id, z.name, z.country ORDER BY total DESC ${zoneLimit}
    `)
  ).rows.map((r) => ({ zoneId: n(r.zone_id), cityId: n(r.city_id), zone: String(r.zone), country: String(r.country), total: n(r.total), avgScore: n(r.avg_score) }));

  // ── Most common detected problems (scoped; latest audit per business) ───────
  const topIssues = (
    await db.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (business_id) business_id, issues
        FROM audits ORDER BY business_id, id DESC
      )
      SELECT issue, count(*)::int AS n
      FROM latest
      JOIN businesses b ON b.id = latest.business_id,
        jsonb_array_elements_text(latest.issues) AS issue
      WHERE ${biz("b")}
      GROUP BY issue ORDER BY n DESC LIMIT 8
    `)
  ).rows.map((r) => ({ issue: String(r.issue), n: n(r.n) }));

  // ── Per-country coverage progress (always global — coverage navigator) ──────
  const planned = (await db.execute(sql`SELECT country, count(*)::int AS total FROM zones WHERE planned AND country IN (${enabledCountriesSql}) GROUP BY country`)).rows;
  const covered = (
    await db.execute(sql`
      SELECT z.country, count(DISTINCT z.id)::int AS covered
      FROM zones z JOIN coverage c ON c.zone_id = z.id
      WHERE c.status IN ('completada','completada_parcial') AND z.country IN (${enabledCountriesSql})
      GROUP BY z.country
    `)
  ).rows;
  const coveredMap = new Map(covered.map((r) => [String(r.country), n(r.covered)]));
  const countryProgress = planned
    .map((r) => ({ country: String(r.country), planned: n(r.total), covered: coveredMap.get(String(r.country)) ?? 0 }))
    .sort((a, b) => b.planned - a.planned);

  return {
    scope: { country, cityId, zoneId },
    total: kpis.total,
    audited: kpis.audited,
    kpis: { ...kpis, cities: cityCount },
    byCountry,
    byCity,
    byCategory,
    scoreBuckets,
    topZones,
    topIssues,
    countryProgress,
  };
}

export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;
