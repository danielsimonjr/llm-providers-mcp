import { describe, it, expect } from "bun:test";
import { ok } from "../src/shared/formatting.js";

describe("ok", () => {
  it("builds the minimal response", () => {
    expect(ok("pong", { provider: "test", model: "test-1" })).toEqual({
      ok: true, provider: "test", model: "test-1", usage: {}, data: "pong",
    });
  });
  it("includes usage when given", () => {
    const r = ok("result", { provider: "openai", model: "gpt-4o-mini", usage: { input_tokens: 10, output_tokens: 5 } });
    expect(r.usage).toEqual({ input_tokens: 10, output_tokens: 5 });
  });
  it("defaults usage to {} when null", () => {
    expect(ok("x", { provider: "p", model: "m", usage: null }).usage).toEqual({});
  });
  it("passes any data type through under the data key", () => {
    for (const v of ["s", 42, { n: "d" }, [1, 2, 3], null]) {
      expect(ok(v, { provider: "t", model: "m" }).data).toEqual(v);
    }
  });
});
