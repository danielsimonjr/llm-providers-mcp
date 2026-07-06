---
name: openai
description: "Ask OpenAI via the llm-openai MCP server (codename Eve). Use when the user says 'ask OpenAI', 'ask GPT', 'ask o3 / the reasoning model', 'get a second opinion from OpenAI', or wants OpenAI to answer/analyze something. Covers the quick model (gpt-4o-mini via openai_quick_query) for everyday questions and the reasoning model (o3-mini via openai_reasoning_query) for architecture, hard bugs, formal reasoning, and step-by-step decomposition. Not for image input."
---

# OpenAI

A playbook for routing questions to OpenAI through the `llm-openai` MCP server (codename Eve). This skill adds no tools of its own — every action below is one of the server's existing MCP tools. Its job is to help you pick the right model for the question and report the answer back consistently.

**Skill root**: this skill ships inside the `llm-openai` sub-plugin of `llm-providers-mcp` (`plugins/llm-openai/skills/openai/`). Slash trigger: `/openai`.

## Which tool

| Tool | Model | Use for |
|---|---|---|
| `openai_quick_query` | gpt-4o-mini (default) | Everyday questions — short factual lookups, quick rewrites, format conversions, classifications. Fast and cheap. |
| `openai_reasoning_query` | o3-mini | Architecture questions, hard bugs, formal reasoning, step-by-step decomposition. Slower and more expensive — reach for it when the question actually needs multi-step reasoning, not by default. |
| `openai_agent_run` | agentic run | Hand off an end-to-end task you want OpenAI to work autonomously, rather than a single question/answer exchange. More expensive than either query tool — reserve for work that genuinely needs autonomy. |

Default to `openai_quick_query` unless the question is the kind that would make you reach for `askOpenAIPro` over `askOpenAI` — architecture, a hard bug, formal reasoning, or a problem that needs to be decomposed step by step.

## How to answer

1. Call the appropriate tool with the user's question.
2. Report OpenAI's answer verbatim — don't paraphrase or trim it.
3. Append a single-line footer with the `model` field from the tool response, e.g. `— gpt-4o-mini` or `— o3-mini`.
4. If the response is an error (`ok: false`), show the error's `kind` and `message` as-is — do not speculate about the cause.
5. If no question was given, ask the user what they want sent to OpenAI before calling any tool.

## Gotcha

These tools are **text-only** — there is no image-input path in `llm-openai`. If the user needs image/screenshot analysis, that isn't available here.
