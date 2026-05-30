export type ErrorKind =
  | "rate_limit" | "auth" | "timeout" | "invalid_request" | "unknown";

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

// Order matters: first match wins. Mirrors shared/errors.py::classify exactly.
export function classify(provider: string, exc: unknown): ProviderError {
  const msg = String(exc instanceof Error ? exc.message : exc);
  const lower = msg.toLowerCase();
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
