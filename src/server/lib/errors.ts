/** Typed errors for external API failures, so callers can react precisely. */

export class ExternalApiError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ExternalApiError";
  }
}

/** Quota / rate-limit exceeded (HTTP 429 or provider-specific OVER_QUERY_LIMIT). */
export class RateLimitError extends ExternalApiError {
  constructor(provider: string, message = "Rate limit / quota exceeded") {
    super(message, provider, 429, true);
    this.name = "RateLimitError";
  }
}

export class TimeoutError extends ExternalApiError {
  constructor(provider: string, ms: number) {
    super(`Request to ${provider} timed out after ${ms}ms`, provider, undefined, true);
    this.name = "TimeoutError";
  }
}
