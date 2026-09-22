import { describe, it, expect } from "bun:test";
import { validateArgs } from "../src/shared/validate.js";

const promptTool = {
  name: "openai_quick_query",
  description: "d",
  inputSchema: {
    type: "object",
    properties: { prompt: { type: "string", description: "The question or task." } },
    required: ["prompt"],
    additionalProperties: false,
  },
} as any;

const multiTool = {
  name: "gemini_multimodal_query",
  description: "d",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string" },
      image_paths: { type: "array" },
    },
    required: ["prompt"],
    additionalProperties: false,
  },
} as any;

describe("validateArgs", () => {
  it("accepts a well-formed call", () => {
    expect(validateArgs(promptTool, { prompt: "hi" })).toBeNull();
  });

  it("names the MISSING required argument rather than letting the SDK spread it", () => {
    // The 2026-09-21 outage: an undefined prompt reached a vendored SDK, which
    // reported "originalInput is not iterable" — its vocabulary, our bug.
    expect(validateArgs(promptTool, {})).toBe(
      "openai_quick_query: 'prompt' is required and was not supplied",
    );
  });

  it("names BOTH faults for a misnamed argument", () => {
    // The actual 2026-09-21 caller error: `query:` where the schema requires
    // `prompt:`. Both are true at once — naming only one hides the half that
    // tells the caller what to type.
    expect(validateArgs(promptTool, { query: "hi" })).toBe(
      "openai_quick_query: 'prompt' is required and was not supplied " +
        "(received unknown argument 'query'; accepted arguments are: prompt)",
    );
  });

  it("names an unknown argument when nothing required is missing", () => {
    expect(validateArgs(promptTool, { prompt: "hi", extra: 1 })).toBe(
      "openai_quick_query: unknown argument 'extra'; accepted arguments are: prompt",
    );
  });

  it("rejects a required argument of the wrong type", () => {
    expect(validateArgs(promptTool, { prompt: 42 })).toBe(
      "openai_quick_query: 'prompt' must be a string, received number",
    );
  });

  it("treats an explicitly undefined value as absent", () => {
    expect(validateArgs(promptTool, { prompt: undefined })).toBe(
      "openai_quick_query: 'prompt' is required and was not supplied",
    );
  });

  it("allows omitted OPTIONAL arguments", () => {
    expect(validateArgs(multiTool, { prompt: "hi" })).toBeNull();
    expect(validateArgs(multiTool, { prompt: "hi", image_paths: ["a.png"] })).toBeNull();
  });

  it("checks array-typed arguments", () => {
    expect(validateArgs(multiTool, { prompt: "hi", image_paths: "a.png" })).toBe(
      "gemini_multimodal_query: 'image_paths' must be an array, received string",
    );
  });

  it("NEVER echoes an argument's value into the message", () => {
    // Security invariant (docs/architecture.md): argument values may carry
    // arbitrary caller context, so echoing one back would turn an error path
    // into a disclosure path. Messages are built from names and `typeof` only.
    const secret = "sk-live-SHOULD-NEVER-APPEAR";
    for (const args of [
      { prompt: secret, extra: secret },
      { query: secret },
      { prompt: { nested: secret } },
    ]) {
      const msg = validateArgs(promptTool, args as any);
      expect(msg).not.toBeNull();
      expect(msg).not.toContain(secret);
      expect(msg).not.toContain("sk-live");
    }
  });

  it("passes anything through when the tool declares no schema", () => {
    expect(validateArgs({ name: "t", description: "d" } as any, { anything: 1 })).toBeNull();
  });

  it("permits extra arguments when additionalProperties is not false", () => {
    const loose = {
      name: "loose",
      description: "d",
      inputSchema: { type: "object", properties: { a: { type: "string" } }, required: ["a"] },
    } as any;
    expect(validateArgs(loose, { a: "x", b: 2 })).toBeNull();
  });
});
