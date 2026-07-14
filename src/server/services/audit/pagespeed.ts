/**
 * Google PageSpeed Insights (Lighthouse) client.
 *
 * One call per strategy (mobile / desktop). Returns category scores 0-100.
 * The API is free but rate-limited; we throttle and tolerate missing categories.
 *
 * Docs: https://developers.google.com/speed/docs/insights/v5/get-started
 */
import { pagespeedKey, requireKey } from "@/server/config/env";
import { fetchJson, RateLimiter } from "@/server/lib/http";

const PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const limiter = new RateLimiter(500); // be gentle with the free quota

export type PsiStrategy = "mobile" | "desktop";

export type PsiScores = {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
};

type LighthouseResponse = {
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null } | undefined>;
  };
};

function pct(score: number | null | undefined): number | null {
  return typeof score === "number" ? Math.round(score * 100) : null;
}

/** Run PageSpeed for one URL + strategy. Throws typed errors on hard failures. */
export async function runPageSpeed(
  url: string,
  strategy: PsiStrategy,
): Promise<PsiScores> {
  const key = requireKey(pagespeedKey(), "PAGESPEED_API_KEY (o GOOGLE_MAPS_API_KEY)");
  await limiter.wait();

  const params = new URLSearchParams({ url, strategy, key });
  // The API accepts repeated `category` params.
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) {
    params.append("category", c);
  }

  const data = await fetchJson<LighthouseResponse>(`${PSI_URL}?${params.toString()}`, {
    provider: "pagespeed",
    timeoutMs: 60000, // Lighthouse runs can be slow
    retries: 2,
    // 400 often means "site unreachable / could not audit" — don't retry those.
    retryStatuses: [429, 500, 502, 503, 504],
  });

  const cats = data.lighthouseResult?.categories ?? {};
  return {
    performance: pct(cats["performance"]?.score),
    seo: pct(cats["seo"]?.score),
    accessibility: pct(cats["accessibility"]?.score),
    bestPractices: pct(cats["best-practices"]?.score),
  };
}
