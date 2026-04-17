---
name: askOpenAIPro
description: Ask an OpenAI reasoning model (o3-mini) a hard question via the llm-openai MCP server
argument-hint: [your question]
---

Use the `mcp__llm-openai__openai_reasoning_query` tool to ask the OpenAI reasoning model:

$ARGUMENTS

Report OpenAI's answer verbatim. Append a single-line footer with the model name from the tool response's `model` field (e.g. `— o3-mini`).

Reasoning models are slower and more expensive than gpt-4o-mini — use this for architecture questions, hard bugs, formal reasoning, or step-by-step problem decomposition.

If the response is an error (`ok: false`), show the error `kind` and `message` without speculating about the cause.

If `$ARGUMENTS` is empty, ask the user what they want the reasoning model to answer before calling the tool.
