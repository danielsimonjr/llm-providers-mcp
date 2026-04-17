---
name: askGemini
description: Ask Google Gemini a question via the llm-gemini MCP server
argument-hint: [your question]
---

Use the `mcp__llm-gemini__gemini_quick_query` tool to ask Gemini:

$ARGUMENTS

Report Gemini's answer verbatim. Append a single-line footer with the model name from the tool response's `model` field (e.g. `— gemini-2.5-flash`).

If the response is an error (`ok: false`), show the error `kind` and `message` without speculating about the cause.

If `$ARGUMENTS` is empty, ask the user what they want Gemini to answer before calling the tool.
