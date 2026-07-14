/**
 * Repository for businesses (leads), notes and the read models the dashboard needs.
 *
 * Dedup is global by `place_id`: the same business found in two overlapping zone
 * searches is never duplicated — it is upserted. We report insert-vs-update using
 * Postgres' `xmax` system column (0 on a fresh insert) so callers can count new
 * vs refreshed businesses in a single round-trip.
 */
import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { businesses, audits, notes, zones, cities } from "@/server/db/schema";
import type { LeadStatus } from "@/server/db/schema";

export type BusinessUpsert = {
  placeId: string;
  name: string;
  category?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  internationalPhone?: string | null;
  website?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  businessStatus?: string | null;
  googleTypes?: string[] | null;
  country?: string | null;
  zoneId?: number | null;
  raw?: unknown;
};

/** Insert or update a business by place_id. Returns whether it was newly created. */
export async function upsertBusiness(
  input: BusinessUpsert,
): Promise<{ id: number; created: boolean }> {
  const now = new Date();
  const [row] = await db
    .insert(businesses)
    .values({
      placeId: input.placeId,
      name: input.name,
      category: input.category ?? null,
      address: input.address ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      phone: input.phone ?? null,
      internationalPhone: input.internationalPhone ?? null,
      website: input.website ?? null,
      rating: input.rating ?? null,
      reviewsCount: input.reviewsCount ?? null,
      businessStatus: input.businessStatus ?? null,
      googleTypes: input.googleTypes ?? null,
      country: input.country ?? null,
      zoneId: input.zoneId ?? null,
      raw: input.raw ?? null,
      firstSeenAt: now,
      lastSeenAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: businesses.placeId,
      set: {
        // Refresh mutable fields; never touch firstSeenAt / lead state.
        name: input.name,
        category: input.category ?? null,
        address: input.address ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        phone: input.phone ?? null,
        internationalPhone: input.internationalPhone ?? null,
        website: input.website ?? null,
        rating: input.rating ?? null,
        reviewsCount: input.reviewsCount ?? null,
        businessStatus: input.businessStatus ?? null,
        googleTypes: input.googleTypes ?? null,
        // keep the most recent zone where it was found
        zoneId: input.zoneId ?? null,
        raw: input.raw ?? null,
        lastSeenAt: now,
        updatedAt: now,
      },
    })
    .returning({ id: businesses.id, inserted: sql<boolean>`(xmax = 0)` });

  return { id: row.id, created: row.inserted };
}

/** Businesses that have a website but no audit yet (or an audit older than `staleDays`). */
export async function businessesNeedingAudit(staleDays?: number) {
  const conditions: SQL[] = [
    sql`${businesses.website} is not null`,
    sql`${businesses.website} <> ''`,
  ];
  if (staleDays && staleDays > 0) {
    conditions.push(
      sql`(${businesses.lastAuditedAt} is null or ${businesses.lastAuditedAt} < now() - ${`${staleDays} days`}::interval)`,
    );
  } else {
    conditions.push(sql`${businesses.auditStatus} = 'none'`);
  }
  return db
    .select({ id: businesses.id, website: businesses.website, name: businesses.name })
    .from(businesses)
    .where(and(...conditions));
}

export type LeadFilters = {
  country?: string;
  cityId?: number;
  zoneId?: number;
  category?: string;
  minScore?: number;
  leadStatus?: LeadStatus;
  unaudited?: boolean; // only businesses never audited (the "what's left to audit" view)
  q?: string; // free-text search by business name
  limit?: number;
  offset?: number;
};

/** Lead table for the dashboard: sorted by opportunity score (desc, nulls last). */
export async function listLeads(filters: LeadFilters = {}) {
  const conditions: SQL[] = [];
  if (filters.country) conditions.push(eq(businesses.country, filters.country));
  if (filters.cityId) conditions.push(eq(zones.cityId, filters.cityId));
  if (filters.zoneId) conditions.push(eq(businesses.zoneId, filters.zoneId));
  if (filters.category) conditions.push(eq(businesses.category, filters.category));
  if (filters.leadStatus) conditions.push(eq(businesses.leadStatus, filters.leadStatus));
  if (filters.unaudited) conditions.push(eq(businesses.auditStatus, "none"));
  if (typeof filters.minScore === "number")
    conditions.push(gte(businesses.opportunityScore, filters.minScore));
  if (filters.q && filters.q.trim())
    conditions.push(sql`${businesses.name} ilike ${"%" + filters.q.trim() + "%"}`);

  return db
    .select({
      id: businesses.id,
      name: businesses.name,
      category: businesses.category,
      country: businesses.country,
      city: cities.name,
      zone: zones.name,
      website: businesses.website,
      phone: businesses.phone,
      rating: businesses.rating,
      reviewsCount: businesses.reviewsCount,
      opportunityScore: businesses.opportunityScore,
      auditStatus: businesses.auditStatus,
      leadStatus: businesses.leadStatus,
      lastAuditedAt: businesses.lastAuditedAt,
      // Issues from the most recent audit (for the dashboard chips).
      issues: sql<string[] | null>`(
        select ${audits.issues} from ${audits}
        where ${audits.businessId} = ${businesses.id}
        order by ${audits.auditedAt} desc limit 1
      )`,
    })
    .from(businesses)
    .leftJoin(zones, eq(businesses.zoneId, zones.id))
    .leftJoin(cities, eq(zones.cityId, cities.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sql`${businesses.opportunityScore} desc nulls last`, businesses.name)
    .limit(filters.limit ?? 200)
    .offset(filters.offset ?? 0);
}

/**
 * Filter facets for the dashboard. Geographic dropdowns are fed by the zones
 * catalog (`/api/prospect/zones`) client-side, so the only facet still derived
 * from businesses is `categories` — one DISTINCT scan instead of four.
 */
export async function leadFilterFacets() {
  const categories = await db
    .selectDistinct({ v: businesses.category })
    .from(businesses)
    .where(sql`${businesses.category} is not null`);
  return {
    categories: categories.map((c) => c.v).filter(Boolean) as string[],
  };
}

/** Full lead detail: business + latest audit + notes. */
export async function getLeadDetail(id: number) {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
  if (!business) return null;

  const auditRows = await db
    .select()
    .from(audits)
    .where(eq(audits.businessId, id))
    .orderBy(desc(audits.auditedAt))
    .limit(1);

  const noteRows = await db
    .select()
    .from(notes)
    .where(eq(notes.businessId, id))
    .orderBy(desc(notes.createdAt));

  return { business, audit: auditRows[0] ?? null, notes: noteRows };
}

export async function setLeadStatus(id: number, status: LeadStatus) {
  const [row] = await db
    .update(businesses)
    .set({ leadStatus: status, leadStatusUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(businesses.id, id))
    .returning();
  return row ?? null;
}

export async function addNote(businessId: number, body: string) {
  const [row] = await db.insert(notes).values({ businessId, body }).returning();
  return row;
}

export async function countBusinesses(): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(businesses);
  return Number(r.n);
}
