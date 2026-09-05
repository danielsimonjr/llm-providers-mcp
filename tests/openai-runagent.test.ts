import { describe, it, expect, mock, beforeEach } from "bun:test";
import { runAgent } from "../src/openai/agents.js";

// Inject a fake run() so usage extraction can be tested without network or
// module-level mocks (Bun's mock.module is process-wide and would poison
// openai-agents.test.ts).
const runMock = mock(() => Promise.resolve({} as any));

beforeEach(() => runMock.mockClear());

describe("runAgent usage extraction", () => {
  it("maps state.context.usage camelCase fields to snake_case output keys", async () => {
    runMock.mockResolvedValue({
      finalOutput: "hello",
      state: { context: { usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30, requests: 1 } } },
    });
    const [text, usage] = await runAgent({} as any, "p", runMock as any);
    expect(text).toBe("hello");
    expect(usage).toMatchObject({ input_tokens: 10, output_tokens: 20, total_tokens: 30, requests: 1 });
  });

  it("falls back to empty text when finalOutput is missing", async () => {
    runMock.mockResolvedValue({ state: { context: { usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3, requests: 1 } } } });
    const [text] = await runAgent({} as any, "p", runMock as any);
    expect(text).toBe("");
  });

  it("falls back to empty text when finalOutput is a non-string object", async () => {
    runMock.mockResolvedValue({ finalOutput: { not: "a string" }, state: { context: { usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3, requests: 1 } } } });
    const [text] = await runAgent({} as any, "p", runMock as any);
    expect(text).toBe("");
  });

  it("degrades to empty usage object when no usage is present (best-effort)", async () => {
    runMock.mockResolvedValue({ finalOutput: "x" });
    const [text, usage] = await runAgent({} as any, "p", runMock as any);
    expect(text).toBe("x");
    expect(usage).toEqual({});
  });
});
