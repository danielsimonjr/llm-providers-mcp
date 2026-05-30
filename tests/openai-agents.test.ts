import { describe, it, expect, afterEach } from "vitest";
import { buildQuickAgent, buildReasoningAgent, buildGeneralistAgent } from "../src/openai/agents.js";

afterEach(() => {
  delete process.env.OPENAI_QUICK_MODEL;
  delete process.env.OPENAI_REASONING_MODEL;
});

describe("openai agent builders", () => {
  it("quick agent: name, default model, instructions", () => {
    const a = buildQuickAgent();
    expect(a.name).toBe("OpenAI Quick");
    expect(a.model).toBe("gpt-4o-mini");
    expect(a.instructions).toBe("You are a fast, direct assistant. Answer concisely. No preamble, no summaries, no filler.");
  });
  it("reasoning agent: default o3-mini", () => {
    const a = buildReasoningAgent();
    expect(a.name).toBe("OpenAI Reasoning");
    expect(a.model).toBe("o3-mini");
    expect(a.instructions).toBe("You are a careful reasoner. Think step by step when the problem demands it. Prefer correctness over speed.");
  });
  it("generalist agent: default o3-mini + autonomous instructions", () => {
    const a = buildGeneralistAgent();
    expect(a.name).toBe("OpenAI Generalist");
    expect(a.model).toBe("o3-mini");
    expect(a.instructions).toContain("autonomous worker");
  });
  it("honors OPENAI_REASONING_MODEL override (e.g. o3)", () => {
    process.env.OPENAI_REASONING_MODEL = "o3";
    expect(buildReasoningAgent().model).toBe("o3");
    expect(buildGeneralistAgent().model).toBe("o3");
  });
});
