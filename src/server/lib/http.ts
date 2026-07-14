/**
 * fetch wrapper with timeout, bounded retries (exponential backoff) and a simple
 * client-side rate limiter. Shared by all external API clients (Places, PSI, page fetch).
 */
import { ExternalApiError, RateLimitError, TimeoutError } from "@/server/lib/errors";

export type FetchJsonOptions = {
  provider: string;
  timeoutMs?: number;
  retries?: number;
  /** HTTP statuses that should trigger a retry (besides network/timeout). */
  retryStatuses?: number[];
  headers?: Record<string, string>;
  method?: string;
  body?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One request with a hard timeout via AbortController. */
async function fetchWithTimeout(url: string, opts: FetchJsonOptions): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: opts.method ?? "GET",
      headers: opts.headers,
      body: opts.body,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new TimeoutError(opts.provider, timeoutMs);
    }
    throw new ExternalApiError(
      `Network error calling ${opts.provider}: ${(err as Error).message}`,
      opts.provider,
      undefined,
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** GET/POST JSON with retries and backoff. Throws typed errors on failure. */
export async function fetchJson<T>(url: string, opts: FetchJsonOptions): Promise<T> {
  const retries = opts.retries ?? 3;
  const retryStatuses = new Set(opts.retryStatuses ?? [429, 500, 502, 503, 504]);
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, opts);
      if (res.status === 429) throw new RateLimitError(opts.provider);
      if (!res.ok && retryStatuses.has(res.status)) {
        throw new ExternalApiError(
          `${opts.provider} returned ${res.status}`,
          opts.provider,
          res.status,
          true,
        );
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ExternalApiError(
          `${opts.provider} ${res.status}: ${text.slice(0, 300)}`,
          opts.provider,
          res.status,
          false,
        );
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof ExternalApiError ? err.retryable : false;
      if (!retryable || attempt === retries) throw err;
      // Exponential backoff with jitter: 0.5s, 1s, 2s ...
      const backoff = 500 * 2 ** attempt + Math.random() * 250;
      await sleep(backoff);
    }
  }
  throw lastErr;
}

/** Fetch raw text (used by the HTML detectors). Returns body + status + headers, never throws on 4xx/5xx. */
export async function fetchText(
  url: string,
  opts: Omit<FetchJsonOptions, "method" | "body">,
): Promise<{
  ok: boolean;
  status: number;
  body: string;
  finalUrl: string;
  headers: Record<string, string>;
}> {
  const res = await fetchWithTimeout(url, {
    ...opts,
    method: "GET",
    // Pretend to be a browser; some sites block default fetch user agents.
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      ...(opts.headers ?? {}),
    },
  });
  const body = await res.text().catch(() => "");
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => (headers[k] = v));
  return { ok: res.ok, status: res.status, body, finalUrl: res.url, headers };
}

/**
 * Minimal serial rate limiter: ensures at least `minIntervalMs` between calls
 * sharing the same limiter instance. Prevents bursting past provider QPS limits.
 */
export class RateLimiter {
  private last = 0;
  constructor(private readonly minIntervalMs: number) {}
  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.last;
    if (elapsed < this.minIntervalMs) await sleep(this.minIntervalMs - elapsed);
    this.last = Date.now();
  }
}
