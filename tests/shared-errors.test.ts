import { describe, it, expect } from "bun:test";
import { ProviderError, classify } from "../src/shared/errors.js";

describe("classify", () => {
  const cases: [string, string][] = [
    // insufficient_quota (billing) is checked BEFORE rate_limit even though the
    // OpenAI quota 429 also contains "429" — it is a distinct, non-transient kind.
    ["429 You exceeded your current quota, please check your plan and billing details", "insufficient_quota"],
    ["Error: insufficient_quota", "insufficient_quota"],
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
  for (const [message, kind] of cases) {
    it(`classifies ${JSON.stringify(message)} -> ${kind}`, () => {
      const err = classify("test-provider", new Error(message));
      expect(err.kind).toBe(kind);
      expect(err.provider).toBe("test-provider");
    });
  }

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
