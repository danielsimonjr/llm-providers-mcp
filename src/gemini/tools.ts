import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { envOr } from "../shared/secrets.js";
import { ok } from "../shared/formatting.js";
import { classify } from "../shared/errors.js";
import { generate as realGenerate, buildClient } from "./client.js";

const QUICK_MODEL = envOr("GEMINI_QUICK_MODEL", "gemini-2.5-flash");
const REASONING_MODEL = envOr("GEMINI_REASONING_MODEL", "gemini-2.5-pro");

export const TOOLS: Tool[] = [
  {
    name: "gemini_quick_query",
    description: "Fast, cheap one-shot query to Gemini Flash. Use for short factual lookups, creative phrasing, quick synthesis.",
    inputSchema: {
      type: "object",
      properties: { prompt: { type: "string", description: "The question or task." } },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "gemini_reasoning_query",
    description: "Deep reasoning via Gemini Pro. Use for multi-step analysis, hard logic, a distinct second opinion to Claude's.",
    inputSchema: {
      type: "object",
      properties: { prompt: { type: "string", description: "The problem to reason about." } },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "gemini_multimodal_query",
    description: "Multimodal query — Gemini's traditional strength. Use for screenshot analysis, diagram interpretation, OCR, frontend review from a mockup.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The text part of the prompt." },
        image_paths: { type: "array", items: { type: "string" }, description: "Optional list of local image file paths to include." },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
];

export type Handler = (args: any) => Promise<string>;

export function makeHandlers(deps?: { generate?: typeof realGenerate }): Record<string, Handler> {
  const generate = deps?.generate ?? realGenerate;

  async function quick(args: { prompt: string }): Promise<string> {
    try {
      const [text, usage] = await generate(args.prompt, {
        model: QUICK_MODEL,
        maxOutputTokens: 8192,
        thinkingBudget: 0,
        temperature: 0.2,
        systemInstruction: "You are a fast, direct assistant. Answer concisely. No preamble.",
      });
      return JSON.stringify(ok(text, { provider: "gemini", model: QUICK_MODEL, usage }));
    } catch (err) {
      return JSON.stringify(classify("gemini", err).toToolResponse());
    }
  }

  async function reasoning(args: { prompt: string }): Promise<string> {
    try {
      const [text, usage] = await generate(args.prompt, {
        model: REASONING_MODEL,
        maxOutputTokens: 32768,
        thinkingBudget: 8192,
        temperature: 0.2,
        systemInstruction: "You are a careful reasoner. Prefer correctness over speed.",
      });
      return JSON.stringify(ok(text, { provider: "gemini", model: REASONING_MODEL, usage }));
    } catch (err) {
      return JSON.stringify(classify("gemini", err).toToolResponse());
    }
  }

  async function multimodal(args: { prompt: string; image_paths?: string[] }): Promise<string> {
    try {
      const client = buildClient();
      const parts: unknown[] = [args.prompt];
      for (const p of args.image_paths ?? []) {
        const data = readFileSync(p).toString("base64");
        const mimeType = p.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
        parts.push({ inlineData: { mimeType, data } });
      }
      const response = await client.models.generateContent({ model: QUICK_MODEL, contents: parts as any });
      let text = "";
      try {
        text = response.text ?? "";
      } catch {
        text = "";
      }
      return JSON.stringify(ok(text, { provider: "gemini", model: QUICK_MODEL }));
    } catch (err) {
      return JSON.stringify(classify("gemini", err).toToolResponse());
    }
  }

  return {
    gemini_quick_query: quick,
    gemini_reasoning_query: reasoning,
    gemini_multimodal_query: multimodal,
  };
}
