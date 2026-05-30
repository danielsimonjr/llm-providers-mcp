import { GoogleGenAI } from "@google/genai";
import { requireEnv } from "../shared/secrets.js";

export interface GenConfig {
  maxOutputTokens: number;
  systemInstruction?: string;
  temperature?: number;
  thinkingConfig?: { thinkingBudget: number };
}

export interface GenerateOpts {
  model: string;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  temperature?: number;
  systemInstruction?: string;
}

export function buildConfig(opts: {
  maxOutputTokens: number;
  thinkingBudget?: number;
  temperature?: number;
  systemInstruction?: string;
}): GenConfig {
  const config: GenConfig = { maxOutputTokens: opts.maxOutputTokens };
  if (opts.systemInstruction !== undefined) config.systemInstruction = opts.systemInstruction;
  if (opts.temperature !== undefined) config.temperature = opts.temperature;
  if (opts.thinkingBudget !== undefined) config.thinkingConfig = { thinkingBudget: opts.thinkingBudget };
  return config;
}

export function buildClient(): GoogleGenAI {
  const apiKey = requireEnv("GEMINI_API_KEY", "Get one from https://aistudio.google.com/apikey and set it.");
  return new GoogleGenAI({ apiKey });
}

export async function generate(
  prompt: string,
  opts: GenerateOpts,
): Promise<[string, Record<string, unknown>]> {
  const client = buildClient();
  const config = buildConfig({
    maxOutputTokens: opts.maxOutputTokens ?? 8192,
    thinkingBudget: opts.thinkingBudget,
    temperature: opts.temperature,
    systemInstruction: opts.systemInstruction,
  });
  // SDK expects config fields at top-level in GenerateContentConfig, not nested GenConfig object.
  // systemInstruction in GenConfig is typed as string (our shape), but SDK accepts ContentUnion
  // (which includes strings). We cast via 'as any' only for the SDK call.
  const response = await client.models.generateContent({
    model: opts.model,
    contents: prompt,
    config: config as any,
  });
  const usage: Record<string, unknown> = {};
  try {
    const md = (response as any).usageMetadata;
    if (md) {
      usage.input_tokens = md.promptTokenCount;
      usage.output_tokens = md.candidatesTokenCount;
      usage.total_tokens = md.totalTokenCount;
      if (md.thoughtsTokenCount != null) usage.thoughts_tokens = md.thoughtsTokenCount;
    }
    const cands = (response as any).candidates;
    if (cands && cands[0]?.finishReason != null) usage.finish_reason = String(cands[0].finishReason);
  } catch {
    // best-effort
  }
  const text = response.text ?? "";
  return [text, usage];
}
