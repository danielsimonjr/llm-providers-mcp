import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ok } from "../shared/formatting.js";
import { classify } from "../shared/errors.js";
import {
  buildQuickAgent as realQuick,
  buildReasoningAgent as realReasoning,
  buildGeneralistAgent as realGeneralist,
  runAgent as realRunAgent,
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

  return {
    openai_quick_query: (args: { prompt: string }) => viaAgent(buildQuick(), args.prompt),
    openai_reasoning_query: (args: { prompt: string }) => viaAgent(buildReasoning(), args.prompt),
    openai_agent_run: (args: { task: string }) => viaAgent(buildGeneralist(), args.task),
  };
}
