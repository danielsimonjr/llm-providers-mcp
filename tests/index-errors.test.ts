import { describe, it, expect } from "vitest";
import {
  exchange,
  legacyToolsListSequence,
  spawnServer,
} from "./mcp-protocol.js";

function legacyCallSequence(toolName: string, callId = 2) {
  const seq = legacyToolsListSequence(1);
  seq.pop(); // drop tools/list
  seq.push({
    jsonrpc: "2.0",
    id: callId,
    method: "tools/call",
    params: { name: toolName, arguments: {} },
  });
  return seq;
}

describe("index unknown-tool error shape", () => {
  it("gemini returns the contract error shape for an unknown tool", async () => {
    const child = spawnServer("gemini", { GEMINI_API_KEY: "dummy" });
    const msg = await exchange(child, legacyCallSequence("no_such_tool"), (m) => m.id === 2);
    const text = msg.result?.content?.[0]?.text;
    const parsed = text ? JSON.parse(text) : null;
    expect(msg.result?.isError).toBe(true);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toMatchObject({ provider: "gemini", kind: "unknown", retry_after_seconds: null });
    expect(typeof parsed.error.message).toBe("string");
  }, 20000);

  it("openai returns the contract error shape for an unknown tool", async () => {
    const child = spawnServer("openai", { OPENAI_API_KEY: "dummy" });
    const msg = await exchange(child, legacyCallSequence("no_such_tool"), (m) => m.id === 2);
    const text = msg.result?.content?.[0]?.text;
    const parsed = text ? JSON.parse(text) : null;
    expect(msg.result?.isError).toBe(true);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toMatchObject({ provider: "openai", kind: "unknown", retry_after_seconds: null });
    expect(typeof parsed.error.message).toBe("string");
  }, 20000);
});
