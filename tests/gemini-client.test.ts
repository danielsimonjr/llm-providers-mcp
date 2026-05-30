import { describe, it, expect } from "vitest";
import { buildConfig } from "../src/gemini/client.js";

describe("buildConfig", () => {
  it("omits thinkingConfig when budget is undefined", () => {
    const c = buildConfig({ maxOutputTokens: 4096 });
    expect(c.thinkingConfig).toBeUndefined();
  });
  it("sets thinkingBudget 0 to disable thinking (Flash)", () => {
    const c = buildConfig({ maxOutputTokens: 8192, thinkingBudget: 0 });
    expect(c.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });
  it("caps thinking for Pro", () => {
    const c = buildConfig({ maxOutputTokens: 32768, thinkingBudget: 8192, temperature: 0.2 });
    expect(c.thinkingConfig).toEqual({ thinkingBudget: 8192 });
  });
  it("passes temperature, maxOutputTokens, systemInstruction through", () => {
    const c = buildConfig({ maxOutputTokens: 32768, temperature: 0.2, systemInstruction: "You are a careful reasoner." });
    expect(c.maxOutputTokens).toBe(32768);
    expect(c.temperature).toBe(0.2);
    expect(c.systemInstruction).toBe("You are a careful reasoner.");
  });
});
