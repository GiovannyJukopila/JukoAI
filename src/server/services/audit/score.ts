/**
 * Opportunity score (0-100): how much low-hanging fruit a business represents
 * for our services. HIGHER = better lead (more obvious problems we can fix).
 *
 * Pure and deterministic so it's unit-testable. Each contributing problem also
 * emits an `issue` code so the dashboard can explain *why* a lead scores high.
 */
export type ScoreInput = {
  reachable: boolean;
  hasHttps: boolean | null;
  perfMobile: number | null;
  perfDesktop: number | null;
  seoMobile: number | null;
  accessibilityMobile: number | null;
  hasChatWidget: boolean | null;
  isEcommerce: boolean | null;
  expectsEcommerce: boolean;
  reviewsCount: number | null;
};

export type ScoreResult = { score: number; issues: string[] };

export function computeOpportunityScore(input: ScoreInput): ScoreResult {
  let score = 0;
  const issues: string[] = [];
  const add = (pts: number, code: string) => {
    score += pts;
    issues.push(code);
  };

  // Site unreachable / broken — a strong signal on its own.
  if (!input.reachable) {
    add(30, "site_unreachable");
  }

  // Mobile performance (what most local customers experience).
  if (input.perfMobile !== null) {
    if (input.perfMobile < 50) add(25, "perf_mobile_critical");
    else if (input.perfMobile < 80) add(12, "perf_mobile_poor");
  }
  // Desktop performance (secondary).
  if (input.perfDesktop !== null) {
    if (input.perfDesktop < 50) add(8, "perf_desktop_critical");
    else if (input.perfDesktop < 80) add(4, "perf_desktop_poor");
  }

  // SEO basics.
  if (input.seoMobile !== null && input.seoMobile < 80) add(12, "seo_poor");

  // Accessibility.
  if (input.accessibilityMobile !== null && input.accessibilityMobile < 80)
    add(8, "accessibility_poor");

  // No HTTPS — easy, high-value fix.
  if (input.hasHttps === false) add(12, "no_https");

  // No chat / WhatsApp widget — automation/lead-capture opportunity.
  if (input.hasChatWidget === false) add(12, "no_chat");

  // Should sell online but isn't.
  if (input.expectsEcommerce && input.isEcommerce === false)
    add(15, "no_ecommerce_expected");

  // Weak online presence (reviews are a proxy).
  if (input.reviewsCount !== null) {
    if (input.reviewsCount < 30) add(10, "few_reviews");
    else if (input.reviewsCount < 100) add(5, "low_reviews");
  }

  return { score: Math.min(100, score), issues };
}
