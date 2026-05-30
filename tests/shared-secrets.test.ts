import { describe, it, expect, afterEach } from "vitest";
import { requireEnv, envOr, redact, MissingCredentialError } from "../src/shared/secrets.js";

const KEY = "TEST_VAR_LLM_MCP";
afterEach(() => { delete process.env[KEY]; });

describe("requireEnv", () => {
  it("returns the value when set", () => {
    process.env[KEY] = "hello";
    expect(requireEnv(KEY)).toBe("hello");
  });
  it("throws MissingCredentialError when unset", () => {
    delete process.env[KEY];
    expect(() => requireEnv(KEY)).toThrow(MissingCredentialError);
  });
  it("includes the hint in the message", () => {
    delete process.env[KEY];
    expect(() => requireEnv(KEY, "go get one at example.com")).toThrow(/go get one at example.com/);
  });
  it("treats empty string as missing", () => {
    process.env[KEY] = "";
    expect(() => requireEnv(KEY)).toThrow(MissingCredentialError);
  });
});

describe("envOr", () => {
  it("returns the value when set", () => {
    process.env[KEY] = "real";
    expect(envOr(KEY, "default")).toBe("real");
  });
  it("returns the default when unset", () => {
    delete process.env[KEY];
    expect(envOr(KEY, "default")).toBe("default");
  });
  it("returns the default when empty string", () => {
    process.env[KEY] = "";
    expect(envOr(KEY, "default")).toBe("default");
  });
});

describe("redact", () => {
  it("keeps a prefix and masks long values", () => {
    const r = redact("sk-abcdef1234567890");
    expect(r.startsWith("sk-a")).toBe(true);
    expect(r).toContain("*");
    expect(r).not.toContain("abcdef1234567890");
  });
  it("fully masks short values", () => {
    expect(redact("abc")).toBe("***");
  });
  it("handles empty", () => {
    expect(redact("")).toBe("<empty>");
  });
  it("emits ascii only", () => {
    const r = redact("sk-proj-" + "x".repeat(150));
    expect([...r].every((c) => c.charCodeAt(0) < 128)).toBe(true);
  });
});
