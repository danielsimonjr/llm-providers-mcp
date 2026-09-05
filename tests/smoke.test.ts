import { describe, it, expect } from "bun:test";
import {
  exchange,
  legacyToolsListSequence,
  modernToolsListSequence,
  spawnServer,
} from "./mcp-protocol.js";

function expectToolNames(msg: { result?: { tools?: Array<{ name: string }> } }, expected: string[]) {
  const names = msg.result?.tools?.map((t) => t.name).sort();
  expect(names).toEqual(expected);
}

describe("smoke: tool registration", () => {
  it("gemini entrypoint lists its 3 tools (legacy initialize)", async () => {
    const child = spawnServer("gemini", { GEMINI_API_KEY: "dummy-for-startup" });
    const msg = await exchange(child, legacyToolsListSequence(), (m) => m.id === 2 && !!m.result?.tools);
    expectToolNames(msg, ["gemini_multimodal_query", "gemini_quick_query", "gemini_reasoning_query"]);
  }, { timeout: 20000 });

  it("openai entrypoint lists its 3 tools (legacy initialize)", async () => {
    const child = spawnServer("openai", { OPENAI_API_KEY: "dummy-for-startup" });
    const msg = await exchange(child, legacyToolsListSequence(), (m) => m.id === 2 && !!m.result?.tools);
    expectToolNames(msg, ["openai_agent_run", "openai_quick_query", "openai_reasoning_query"]);
  }, { timeout: 20000 });

  it("gemini entrypoint lists its 3 tools (MCP 2026-07-28 envelope)", async () => {
    const child = spawnServer("gemini", { GEMINI_API_KEY: "dummy-for-startup" });
    const msg = await exchange(child, modernToolsListSequence(), (m) => m.id === 1 && !!m.result?.tools);
    expectToolNames(msg, ["gemini_multimodal_query", "gemini_quick_query", "gemini_reasoning_query"]);
  }, { timeout: 20000 });

  it("openai entrypoint lists its 3 tools (MCP 2026-07-28 envelope)", async () => {
    const child = spawnServer("openai", { OPENAI_API_KEY: "dummy-for-startup" });
    const msg = await exchange(child, modernToolsListSequence(), (m) => m.id === 1 && !!m.result?.tools);
    expectToolNames(msg, ["openai_agent_run", "openai_quick_query", "openai_reasoning_query"]);
  }, { timeout: 20000 });
});
