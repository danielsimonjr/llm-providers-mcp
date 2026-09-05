import { describe, it, expect, mock } from "bun:test";
import { makeHandlers, TOOLS } from "../src/gemini/tools.js";

describe("gemini TOOLS defs", () => {
  it("exposes exactly the three tool names", () => {
    expect(TOOLS.map((t) => t.name).sort()).toEqual(
      ["gemini_multimodal_query", "gemini_quick_query", "gemini_reasoning_query"],
    );
  });
  it("requires prompt on quick/reasoning", () => {
    for (const n of ["gemini_quick_query", "gemini_reasoning_query"]) {
      const t = TOOLS.find((x) => x.name === n)!;
      expect((t.inputSchema as any).required).toEqual(["prompt"]);
    }
  });
});

describe("gemini handlers", () => {
  it("quick_query calls generate with Flash + budget 0 + temp 0.2 + concise prompt", async () => {
    const generate = mock(async () => ["hi", { input_tokens: 1 }] as [string, Record<string, unknown>]);
    const handlers = makeHandlers({ generate });
    const out = JSON.parse(await handlers.gemini_quick_query({ prompt: "p" }));
    expect(generate).toHaveBeenCalledWith("p", {
      model: "gemini-2.5-flash",
      maxOutputTokens: 8192,
      thinkingBudget: 0,
      temperature: 0.2,
      systemInstruction: "You are a fast, direct assistant. Answer concisely. No preamble.",
    });
    expect(out).toMatchObject({ ok: true, provider: "gemini", model: "gemini-2.5-flash", data: "hi" });
  });

  it("reasoning_query calls generate with Pro + budget 8192 + maxOut 32768", async () => {
    const generate = mock(async () => ["r", {}] as [string, Record<string, unknown>]);
    const handlers = makeHandlers({ generate });
    await handlers.gemini_reasoning_query({ prompt: "q" });
    expect(generate).toHaveBeenCalledWith("q", {
      model: "gemini-2.5-pro",
      maxOutputTokens: 32768,
      thinkingBudget: 8192,
      temperature: 0.2,
      systemInstruction: "You are a careful reasoner. Prefer correctness over speed.",
    });
  });

  it("maps provider errors to the error response shape", async () => {
    const generate = mock(async () => { throw new Error("429 Too Many Requests"); });
    const handlers = makeHandlers({ generate });
    const out = JSON.parse(await handlers.gemini_quick_query({ prompt: "p" }));
    expect(out).toEqual({
      ok: false,
      error: { provider: "gemini", kind: "rate_limit", message: "429 Too Many Requests", retry_after_seconds: null },
    });
  });
});
