import { describe, it, expect, vi } from "vitest";
import { makeHandlers, TOOLS } from "../src/openai/tools.js";

describe("openai TOOLS defs", () => {
  it("exposes exactly the three tool names", () => {
    expect(TOOLS.map((t) => t.name).sort()).toEqual(
      ["openai_agent_run", "openai_quick_query", "openai_reasoning_query"],
    );
  });
  it("agent_run requires task; queries require prompt", () => {
    expect((TOOLS.find((t) => t.name === "openai_agent_run")!.inputSchema as any).required).toEqual(["task"]);
    expect((TOOLS.find((t) => t.name === "openai_quick_query")!.inputSchema as any).required).toEqual(["prompt"]);
  });
});

describe("openai handlers", () => {
  it("quick_query builds the quick agent and returns ok with its model", async () => {
    const fakeAgent = { name: "OpenAI Quick", model: "gpt-4o-mini", instructions: "x" } as any;
    const runAgent = vi.fn(async () => ["answer", { input_tokens: 3 }] as [string, Record<string, unknown>]);
    const handlers = makeHandlers({
      runAgent,
      buildQuickAgent: () => fakeAgent,
      buildReasoningAgent: () => fakeAgent,
      buildGeneralistAgent: () => fakeAgent,
    });
    const out = JSON.parse(await handlers.openai_quick_query({ prompt: "p" }));
    expect(runAgent).toHaveBeenCalledWith(fakeAgent, "p");
    expect(out).toMatchObject({ ok: true, provider: "openai", model: "gpt-4o-mini", data: "answer" });
  });

  it("agent_run uses the task arg and the generalist agent", async () => {
    const fakeAgent = { name: "OpenAI Generalist", model: "o3-mini" } as any;
    const runAgent = vi.fn(async () => ["done", {}] as [string, Record<string, unknown>]);
    const handlers = makeHandlers({
      runAgent,
      buildQuickAgent: () => fakeAgent,
      buildReasoningAgent: () => fakeAgent,
      buildGeneralistAgent: () => fakeAgent,
    });
    await handlers.openai_agent_run({ task: "do it" });
    expect(runAgent).toHaveBeenCalledWith(fakeAgent, "do it");
  });

  it("maps errors to the error response shape", async () => {
    const fakeAgent = { name: "OpenAI Quick", model: "gpt-4o-mini" } as any;
    const runAgent = vi.fn(async () => { throw new Error("401 Unauthorized"); });
    const handlers = makeHandlers({
      runAgent,
      buildQuickAgent: () => fakeAgent,
      buildReasoningAgent: () => fakeAgent,
      buildGeneralistAgent: () => fakeAgent,
    });
    const out = JSON.parse(await handlers.openai_quick_query({ prompt: "p" }));
    expect(out).toEqual({
      ok: false,
      error: { provider: "openai", kind: "auth", message: "401 Unauthorized", retry_after_seconds: null },
    });
  });
});
