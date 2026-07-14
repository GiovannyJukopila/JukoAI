/**
 * Batch auditing per (zone × category) for the coverage dashboard.
 *
 * PageSpeed is slow (~20-40s per site), so the UI drives auditing in small chunks
 * via `auditZoneCategoryBatch` and shows a progress bar. State is the businesses'
 * `auditStatus`, so it's naturally resumable: re-running only audits the pending.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { businesses } from "@/server/db/schema";
import { auditBusiness } from "@/server/services/audit/runner";

const hasWebsite = sql`${businesses.website} is not null and ${businesses.website} <> ''`;

/** Per-category audit counts (auditable = has website) for a zone. */
export async function zoneAuditProgress(zoneId: number) {
  return db
    .select({
      category: businesses.category,
      total: sql<number>`count(*) filter (where ${hasWebsite})`,
      audited: sql<number>`count(*) filter (where ${hasWebsite} and ${businesses.auditStatus} <> 'none')`,
    })
    .from(businesses)
    .where(eq(businesses.zoneId, zoneId))
    .groupBy(businesses.category);
}

async function counts(zoneId: number, category: string) {
  const [r] = await db
    .select({
      total: sql<number>`count(*) filter (where ${hasWebsite})`,
      audited: sql<number>`count(*) filter (where ${hasWebsite} and ${businesses.auditStatus} <> 'none')`,
    })
    .from(businesses)
    .where(and(eq(businesses.zoneId, zoneId), eq(businesses.category, category)));
  return { total: Number(r?.total ?? 0), audited: Number(r?.audited ?? 0) };
}

/** Audit up to `limit` not-yet-audited businesses in a zone×category. */
export async function auditZoneCategoryBatch(zoneId: number, category: string, limit = 3) {
  const pending = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(
      and(
        eq(businesses.zoneId, zoneId),
        eq(businesses.category, category),
        sql`${businesses.website} is not null and ${businesses.website} <> ''`,
        eq(businesses.auditStatus, "none"),
      ),
    )
    .limit(limit);

  // Audit this chunk concurrently (PSI's own rate limiter still paces the calls).
  await Promise.all(pending.map((b) => auditBusiness(b.id).catch(() => null)));

  const { total, audited } = await counts(zoneId, category);
  return { total, audited, remaining: Math.max(0, total - audited), justDone: pending.length };
}
