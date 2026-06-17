export type ErrorKind =
  | "insufficient_quota" | "rate_limit" | "auth" | "timeout" | "invalid_request" | "unknown";

export class ProviderError extends Error {
  constructor(
    public provider: string,
    public kind: ErrorKind,
    public readonly providerMessage: string,
    public retryAfterSeconds: number | null = null,
  ) {
    super(providerMessage);
    this.name = "ProviderError";
  }

  toToolResponse(): {
    ok: false;
    error: { provider: string; kind: ErrorKind; message: string; retry_after_seconds: number | null };
  } {
    return {
      ok: false,
      error: {
        provider: this.provider,
        kind: this.kind,
        message: this.providerMessage,
        retry_after_seconds: this.retryAfterSeconds,
      },
    };
  }
}

// Order matters: first match wins.
export function classify(provider: string, exc: unknown): ProviderError {
  const msg = String(exc instanceof Error ? exc.message : exc);
  const lower = msg.toLowerCase();
  // `insufficient_quota` (out of credits / spend cap) is a BILLING condition,
  // not a transient throttle — so it is classified distinctly from `rate_limit`
  // and must be checked first (OpenAI's quota 429 also contains "429"). Retrying
  // / backing off cannot clear it; only adding credits or a fallback to a model
  // with separate quota can.
  if (
    lower.includes("insufficient_quota") ||
    lower.includes("exceeded your current quota") ||
    lower.includes("check your plan and billing")
  )
    return new ProviderError(provider, "insufficient_quota", msg);
  if (lower.includes("rate limit") || lower.includes("429"))
    return new ProviderError(provider, "rate_limit", msg);
  if (lower.includes("unauthorized") || lower.includes("401") || lower.includes("api key"))
    return new ProviderError(provider, "auth", msg);
  if (lower.includes("timeout") || lower.includes("timed out"))
    return new ProviderError(provider, "timeout", msg);
  if (lower.includes("invalid") || lower.includes("400"))
    return new ProviderError(provider, "invalid_request", msg);
  return new ProviderError(provider, "unknown", msg);
}
