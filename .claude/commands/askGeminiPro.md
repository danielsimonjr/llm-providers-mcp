---
name: askGeminiPro
description: Ask Gemini 2.5 Pro a hard question (deep reasoning) via the llm-gemini MCP server
argument-hint: [your question]
---

Use the `mcp__llm-gemini__gemini_reasoning_query` tool to ask Gemini Pro:

$ARGUMENTS

Report Gemini's answer verbatim. Append a single-line footer with the model name from the tool response's `model` field (e.g. `— gemini-2.5-pro`).

Gemini Pro is slower and more expensive than Flash — use this for multi-step reasoning, complex analysis, or when you want a careful second opinion.

If the response is an error (`ok: false`), show the error `kind` and `message` without speculating about the cause.

If `$ARGUMENTS` is empty, ask the user what they want Gemini Pro to answer before calling the tool.
