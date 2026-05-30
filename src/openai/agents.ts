import { Agent, run } from "@openai/agents";
import { envOr } from "../shared/secrets.js";

export function buildQuickAgent(): Agent {
  return new Agent({
    name: "OpenAI Quick",
    model: envOr("OPENAI_QUICK_MODEL", "gpt-4o-mini"),
    instructions: "You are a fast, direct assistant. Answer concisely. No preamble, no summaries, no filler.",
  });
}

export function buildReasoningAgent(): Agent {
  return new Agent({
    name: "OpenAI Reasoning",
    model: envOr("OPENAI_REASONING_MODEL", "o3-mini"),
    instructions: "You are a careful reasoner. Think step by step when the problem demands it. Prefer correctness over speed.",
  });
}

export function buildGeneralistAgent(): Agent {
  return new Agent({
    name: "OpenAI Generalist",
    model: envOr("OPENAI_REASONING_MODEL", "o3-mini"),
    instructions:
      "You are an autonomous worker. You will receive a task from another agent (Claude). " +
      "Complete the task end-to-end. If the task is ambiguous, note your assumptions and proceed. " +
      "Return a complete, self-contained result.",
  });
}

export async function runAgent(agent: Agent, prompt: string): Promise<[string, Record<string, unknown>]> {
  const result: any = await run(agent, prompt);
  let usage: Record<string, unknown> = {};
  try {
    // Usage lives at result.state.context.usage with camelCase fields
    const raw =
      result.state?.context?.usage ??
      result.context?.usage ??
      result.usage;
    usage = {
      input_tokens: raw.inputTokens ?? raw.input_tokens,
      output_tokens: raw.outputTokens ?? raw.output_tokens,
      total_tokens: raw.totalTokens ?? raw.total_tokens,
      requests: raw.requests,
    };
    // Port-faithful with the Python original (output_tokens_details.reasoning_tokens,
    // input_tokens_details.cached_tokens). @openai/agents@0.1.11 does not currently
    // expose these in its usage schema, so these branches are forward-compat / best-effort.
    const reasoningDetails = raw.outputTokensDetails;
    if (Array.isArray(reasoningDetails)) {
      const reasoning = reasoningDetails.reduce((sum: number, d: Record<string, number>) =>
        sum + (d.reasoningTokens ?? d.reasoning_tokens ?? 0), 0);
      if (reasoning) usage.reasoning_tokens = reasoning;
    } else if (reasoningDetails?.reasoningTokens ?? reasoningDetails?.reasoning_tokens) {
      usage.reasoning_tokens = reasoningDetails.reasoningTokens ?? reasoningDetails.reasoning_tokens;
    }
    const cachedDetails = raw.inputTokensDetails;
    if (Array.isArray(cachedDetails)) {
      const cached = cachedDetails.reduce((sum: number, d: Record<string, number>) =>
        sum + (d.cachedTokens ?? d.cached_tokens ?? 0), 0);
      if (cached) usage.cached_tokens = cached;
    } else if (cachedDetails?.cachedTokens ?? cachedDetails?.cached_tokens) {
      usage.cached_tokens = cachedDetails.cachedTokens ?? cachedDetails.cached_tokens;
    }
  } catch {
    usage = {};
  }
  // finalOutput is a string for text-output agents (the default); fall back to
  // "" for any nullish or non-string output rather than stringifying an object.
  const text = typeof result.finalOutput === "string" ? result.finalOutput : "";
  return [text, usage];
}
