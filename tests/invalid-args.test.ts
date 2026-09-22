import { describe, it, expect } from "bun:test";
import { exchange, legacyToolsListSequence, spawnServer } from "./mcp-protocol.js";

/**
 * End-to-end regression for the 2026-09-21 llm-openai incident.
 *
 * A caller passed `query:` where the schema requires `prompt:`. Nothing enforced
 * the declared contract, so `undefined` reached the vendored provider SDK and the
 * SDK reported "originalInput is not iterable" — its own vocabulary, naming our
 * bug, which sent two agents reading a bundled dependency instead of the call.
 *
 * These calls use a dummy key deliberately: validation must reject the call
 * BEFORE any network request, so the assertion holds without credentials.
 */
function callWith(toolName: string, args: Record<string, unknown>, callId = 2) {
  const seq = legacyToolsListSequence(1);
  seq.pop();
  seq.push({
    jsonrpc: "2.0",
    id: callId,
    method: "tools/call",
    params: { name: toolName, arguments: args },
  });
  return seq;
}

async function callTool(entry: string, env: Record<string, string>, tool: string, args: Record<string, unknown>) {
  const child = spawnServer(entry, env);
  const msg = await exchange(child, callWith(tool, args), (m) => m.id === 2);
  const text = msg.result?.content?.[0]?.text;
  return { isError: msg.result?.isError, parsed: text ? JSON.parse(text) : null };
}

describe("invalid arguments are refused in OUR vocabulary", () => {
  it("openai_quick_query names the misnamed argument instead of the SDK spread", async () => {
    const { isError, parsed } = await callTool(
      "openai", { OPENAI_API_KEY: "dummy" }, "openai_quick_query", { query: "hi" },
    );
    expect(isError).toBe(true);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.provider).toBe("openai");
    expect(parsed.error.kind).toBe("invalid_request");
    expect(parsed.error.message).toBe(
      "openai_quick_query: 'prompt' is required and was not supplied " +
        "(received unknown argument 'query'; accepted arguments are: prompt)",
    );
    // The original symptom must NOT survive anywhere in the response.
    expect(parsed.error.message).not.toContain("originalInput");
    expect(parsed.error.message).not.toContain("is not iterable");
  }, { timeout: 20000 });

  it("openai_reasoning_query refuses an omitted prompt", async () => {
    const { parsed } = await callTool(
      "openai", { OPENAI_API_KEY: "dummy" }, "openai_reasoning_query", {},
    );
    expect(parsed.error.kind).toBe("invalid_request");
    expect(parsed.error.message).toBe(
      "openai_reasoning_query: 'prompt' is required and was not supplied",
    );
  }, { timeout: 20000 });

  it("the same guard covers gemini — it is a shared-layer fix, not a per-provider patch", async () => {
    const { parsed } = await callTool(
      "gemini", { GEMINI_API_KEY: "dummy" }, "gemini_quick_query", { query: "hi" },
    );
    expect(parsed.error.provider).toBe("gemini");
    expect(parsed.error.kind).toBe("invalid_request");
    expect(parsed.error.message).toContain("'prompt' is required and was not supplied");
  }, { timeout: 20000 });

  it("a valid call is NOT rejected by the guard (it fails later, on the dummy key)", async () => {
    const { parsed } = await callTool(
      "openai", { OPENAI_API_KEY: "dummy" }, "openai_quick_query", { prompt: "hi" },
    );
    // Proves the guard lets well-formed calls through: whatever goes wrong next
    // is an auth/network condition, never our invalid_request refusal.
    expect(parsed.error?.kind).not.toBe("invalid_request");
  }, { timeout: 30000 });
});
