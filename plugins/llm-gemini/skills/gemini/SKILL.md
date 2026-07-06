---
name: gemini
description: "Ask Google Gemini via the llm-gemini MCP server (codename Adam). Use when the user says 'ask Gemini', 'ask Gemini Pro', 'get a second opinion from Gemini', or wants Gemini to answer/analyze something. Covers the quick model (gemini-2.5-flash via gemini_quick_query) for everyday questions and Gemini 2.5 Pro (gemini_reasoning_query) for multi-step reasoning, complex analysis, and careful second opinions. A gemini_multimodal_query tool also handles image/multimodal input."
---

# Gemini

A playbook for routing questions to Google Gemini through the `llm-gemini` MCP server (codename Adam). This skill adds no tools of its own — every action below is one of the server's existing MCP tools. Its job is to help you pick the right model for the question and report the answer back consistently.

**Skill root**: this skill ships inside the `llm-gemini` sub-plugin of `llm-providers-mcp` (`plugins/llm-gemini/skills/gemini/`). Slash trigger: `/gemini`.

## Which tool

| Tool | Model | Use for |
|---|---|---|
| `gemini_quick_query` | gemini-2.5-flash (default) | Everyday questions — short factual lookups, creative phrasing, quick synthesis. Fast and cheap. |
| `gemini_reasoning_query` | gemini-2.5-pro | Multi-step reasoning, complex analysis, or when you want a careful second opinion distinct from Claude's. Slower and more expensive — reach for it when the question needs it, not by default. |
| `gemini_multimodal_query` | (accepts images) | Screenshot analysis, diagram interpretation, OCR, frontend review from a mockup — anything with image input. |

Default to `gemini_quick_query` unless the question is the kind that would make you reach for `askGeminiPro` over `askGemini` — multi-step reasoning, complex analysis, or a careful second opinion.

## How to answer

1. Call the appropriate tool with the user's question.
2. Report Gemini's answer verbatim — don't paraphrase or trim it.
3. Append a single-line footer with the `model` field from the tool response, e.g. `— gemini-2.5-flash` or `— gemini-2.5-pro`.
4. If the response is an error (`ok: false`), show the error's `kind` and `message` as-is — do not speculate about the cause.
5. If no question was given, ask the user what they want sent to Gemini before calling any tool.

## Gotcha

For image or other multimodal input, use `gemini_multimodal_query` — not `gemini_quick_query` or `gemini_reasoning_query`, which are text-only.
