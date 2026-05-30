import { describe, it, expect } from "vitest";
import { ProviderError, classify } from "../src/shared/errors.js";

describe("classify", () => {
  const cases: [string, string][] = [
    ["Rate limit exceeded", "rate_limit"],
    ["429 Too Many Requests", "rate_limit"],
    ["Unauthorized", "auth"],
    ["401 Forbidden", "auth"],
    ["Invalid API key provided", "auth"],
    ["Request timed out", "timeout"],
    ["connection timeout", "timeout"],
    ["Invalid request payload", "invalid_request"],
    ["400 Bad Request", "invalid_request"],
    ["Some unknown weird glitch", "unknown"],
  ];
  it.each(cases)("classifies %s -> %s", (message, kind) => {
    const err = classify("test-provider", new Error(message));
    expect(err.kind).toBe(kind);
    expect(err.provider).toBe("test-provider");
  });

  it("produces the tool-response shape", () => {
    const resp = classify("openai", new Error("Rate limit exceeded")).toToolResponse();
    expect(resp).toEqual({
      ok: false,
      error: { provider: "openai", kind: "rate_limit", message: "Rate limit exceeded", retry_after_seconds: null },
    });
  });
});

describe("ProviderError", () => {
  it("is an Error", () => {
    expect(classify("t", new Error("x")) instanceof Error).toBe(true);
  });
  it("defaults retryAfterSeconds to null", () => {
    expect(new ProviderError("t", "rate_limit", "slow").retryAfterSeconds).toBeNull();
  });
});
