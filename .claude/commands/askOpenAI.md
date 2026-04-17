---
name: askOpenAI
description: Ask OpenAI a question via the llm-openai MCP server
argument-hint: [your question]
---

Use the `mcp__llm-openai__openai_quick_query` tool to ask OpenAI:

$ARGUMENTS

Report OpenAI's answer verbatim. Append a single-line footer with the model name from the tool response's `model` field (e.g. `— gpt-4o-mini`).

If the response is an error (`ok: false`), show the error `kind` and `message` without speculating about the cause.

If `$ARGUMENTS` is empty, ask the user what they want OpenAI to answer before calling the tool.
