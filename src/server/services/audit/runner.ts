/**
 * Audit runner: for a business with a website, run PageSpeed (mobile + desktop),
 * the HTML detectors, compute the opportunity score, persist an `audits` row and
 * denormalize the summary onto `businesses`.
 *
 * Resilient by design: a failing PSI strategy or unreachable site yields a
 * partial audit rather than aborting — we still capture whatever signal we got.
 */
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { businesses, audits } from "@/server/db/schema";
import type { AuditStatus } from "@/server/db/schema";
import { runPageSpeed, type PsiScores } from "@/server/services/audit/pagespeed";
import { detectWebsite } from "@/server/services/audit/detectors";
import { computeOpportunityScore } from "@/server/services/audit/score";
import { getCategory } from "@/server/config/categories";
import { logApiUsage, COST } from "@/server/services/usage/tracker";

export type AuditOutcome = {
  businessId: number;
  status: AuditStatus | "skipped";
  opportunityScore: number | null;
  issues: string[];
  message?: string;
};

const EMPTY_PSI: PsiScores = {
  performance: null,
  seo: null,
  accessibility: null,
  bestPractices: null,
};

/** Audit a single business by id. */
export async function auditBusiness(businessId: number): Promise<AuditOutcome> {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) {
    return { businessId, status: "skipped", opportunityScore: null, issues: [], message: "no existe" };
  }
  if (!biz.website) {
    return {
      businessId,
      status: "skipped",
      opportunityScore: null,
      issues: [],
      message: "sin sitio web",
    };
  }

  let psiError: string | null = null;
  let fetchOk = true;

  // ── HTML detectors ──
  const detect = await detectWebsite(biz.website);
  if (detect.fetchError) fetchOk = false;

  // ── PageSpeed (mobile + desktop), each independent ──
  let mobile = EMPTY_PSI;
  let desktop = EMPTY_PSI;
  try {
    mobile = await runPageSpeed(biz.website, "mobile");
    await logApiUsage({
      provider: "pagespeed",
      operation: "runPagespeed:mobile",
      businessId,
      costUsd: COST.pagespeed,
    });
  } catch (err) {
    psiError = `mobile: ${(err as Error).message}`;
  }
  try {
    desktop = await runPageSpeed(biz.website, "desktop");
    await logApiUsage({
      provider: "pagespeed",
      operation: "runPagespeed:desktop",
      businessId,
      costUsd: COST.pagespeed,
    });
  } catch (err) {
    psiError = psiError ? `${psiError}; desktop: ${(err as Error).message}` : `desktop: ${(err as Error).message}`;
  }

  // ── Opportunity score ──
  const expectsEcommerce = !!getCategory(biz.category ?? "")?.expectsEcommerce;
  const { score, issues } = computeOpportunityScore({
    reachable: detect.reachable,
    hasHttps: detect.hasHttps,
    perfMobile: mobile.performance,
    perfDesktop: desktop.performance,
    seoMobile: mobile.seo,
    accessibilityMobile: mobile.accessibility,
    hasChatWidget: detect.hasChatWidget,
    isEcommerce: detect.isEcommerce,
    expectsEcommerce,
    reviewsCount: biz.reviewsCount,
  });

  // ── Determine audit status ──
  const psiTotallyFailed = mobile === EMPTY_PSI && desktop === EMPTY_PSI;
  let status: AuditStatus;
  if (!fetchOk && psiTotallyFailed) status = "error";
  else if (psiError || !fetchOk) status = "partial";
  else status = "ok";

  // ── Persist audit row ──
  const now = new Date();
  await db.insert(audits).values({
    businessId,
    auditedAt: now,
    psiMobilePerformance: mobile.performance,
    psiMobileSeo: mobile.seo,
    psiMobileAccessibility: mobile.accessibility,
    psiMobileBestPractices: mobile.bestPractices,
    psiDesktopPerformance: desktop.performance,
    psiDesktopSeo: desktop.seo,
    psiDesktopAccessibility: desktop.accessibility,
    psiDesktopBestPractices: desktop.bestPractices,
    hasHttps: detect.hasHttps,
    hasChatWidget: detect.hasChatWidget,
    chatVendor: detect.chatVendor,
    isEcommerce: detect.isEcommerce,
    ecommercePlatform: detect.ecommercePlatform,
    techSignals: detect.techSignals,
    emails: detect.emails,
    phones: detect.phones,
    issues,
    opportunityScore: score,
    httpStatus: detect.httpStatus,
    psiError,
    fetchError: detect.fetchError,
  });

  // ── Denormalize summary onto the business ──
  await db
    .update(businesses)
    .set({
      opportunityScore: score,
      auditStatus: status,
      lastAuditedAt: now,
      updatedAt: now,
    })
    .where(eq(businesses.id, businessId));

  return {
    businessId,
    status,
    opportunityScore: score,
    issues,
    message: psiError ?? detect.fetchError ?? undefined,
  };
}
