import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ok } from "../shared/formatting.js";
import { classify } from "../shared/errors.js";
import {
  buildQuickAgent as realQuick,
  buildReasoningAgent as realReasoning,
  buildGeneralistAgent as realGeneralist,
  runAgent as realRunAgent,
  reasoningFallbackModel,
} from "./agents.js";

export const TOOLS: Tool[] = [
  {
    name: "openai_quick_query",
    description:
      "Fast, cheap one-shot query to a small OpenAI model. Use for short factual lookups, quick rewrites, format conversions, classifications. Not for multi-step reasoning.",
    inputSchema: {
      type: "object",
      properties: { prompt: { type: "string", description: "The question or task." } },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "openai_reasoning_query",
    description:
      "Deep-reasoning query to a frontier OpenAI reasoning model. Use for architecture questions, hard bugs, debugging, step-by-step thinking. Slower and more expensive.",
    inputSchema: {
      type: "object",
      properties: { prompt: { type: "string", description: "The problem to reason about." } },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "openai_agent_run",
    description:
      "Hand an end-to-end task to an autonomous OpenAI agent. Use for tasks you'd rather delegate entirely. More expensive than a query — reserve for work that needs real autonomy.",
    inputSchema: {
      type: "object",
      properties: { task: { type: "string", description: "A complete task description." } },
      required: ["task"],
      additionalProperties: false,
    },
  },
];

export type Handler = (args: any) => Promise<string>;

interface Deps {
  runAgent?: typeof realRunAgent;
  buildQuickAgent?: typeof realQuick;
  buildReasoningAgent?: typeof realReasoning;
  buildGeneralistAgent?: typeof realGeneralist;
}

export function makeHandlers(deps?: Deps): Record<string, Handler> {
  const runAgent = deps?.runAgent ?? realRunAgent;
  const buildQuick = deps?.buildQuickAgent ?? realQuick;
  const buildReasoning = deps?.buildReasoningAgent ?? realReasoning;
  const buildGeneralist = deps?.buildGeneralistAgent ?? realGeneralist;

  async function viaAgent(agent: any, input: string): Promise<string> {
    try {
      const [text, usage] = await runAgent(agent, input);
      return JSON.stringify(ok(text, { provider: "openai", model: agent.model, usage }));
    } catch (err) {
      return JSON.stringify(classify("openai", err).toToolResponse());
    }
  }

  /**
   * Run `primaryAgent`; if it 429s (rate_limit OR insufficient_quota) and a
   * DISTINCT fallback model is available, retry once on the fallback (built via
   * `buildFb`). On any other error — or if the fallback also fails — return the
   * (clearer) error. The fallback shares the account credit pool, so a truly
   * exhausted balance still surfaces as insufficient_quota from both.
   */
  async function viaAgentWithFallback(
    primaryAgent: any,
    input: string,
    buildFb: () => any,
  ): Promise<string> {
    try {
      const [text, usage] = await runAgent(primaryAgent, input);
      return JSON.stringify(ok(text, { provider: "openai", model: primaryAgent.model, usage }));
    } catch (err) {
      const pe = classify("openai", err);
      if (pe.kind !== "rate_limit" && pe.kind !== "insufficient_quota") {
        return JSON.stringify(pe.toToolResponse());
      }
      const fb = buildFb();
      if (!fb || fb.model === primaryAgent.model) {
        return JSON.stringify(pe.toToolResponse()); // no distinct fallback to try
      }
      try {
        const [text, usage] = await runAgent(fb, input);
        return JSON.stringify(
          ok(text, {
            provider: "openai",
            model: fb.model,
            usage: { ...usage, fallback_from: primaryAgent.model },
          }),
        );
      } catch (err2) {
        return JSON.stringify(classify("openai", err2).toToolResponse());
      }
    }
  }

  return {
    openai_quick_query: (args: { prompt: string }) => viaAgent(buildQuick(), args.prompt),
    openai_reasoning_query: (args: { prompt: string }) =>
      viaAgentWithFallback(buildReasoning(), args.prompt, () => buildReasoning(reasoningFallbackModel())),
    openai_agent_run: (args: { task: string }) =>
      viaAgentWithFallback(buildGeneralist(), args.task, () => buildGeneralist(reasoningFallbackModel())),
  };
}
