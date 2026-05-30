# llm-providers-mcp

Local MCP servers that let Claude Code delegate work to OpenAI and Google Gemini
through each provider's own official Agent SDK.

[![CI](https://github.com/danielsimonjr/llm-providers-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/danielsimonjr/llm-providers-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node: >=24](https://img.shields.io/badge/node-%3E%3D24-blue.svg)](package.json)

No third-party plugin, no telemetry, no postinstall scripts. Every line is
yours to audit. Built against the MCP TypeScript SDK and the official provider
SDKs (`@openai/agents`, `@google/genai`).

## Tools exposed

| Server | Tool | Intent |
|---|---|---|
| `llm-openai` | `openai_quick_query` | Fast one-shot (gpt-4o-mini) |
| | `openai_reasoning_query` | Deep reasoning (o3-mini) |
| | `openai_agent_run` | Hand off an autonomous task |
| `llm-gemini` | `gemini_quick_query` | Fast one-shot (Gemini Flash) |
| | `gemini_reasoning_query` | Deep reasoning (Gemini Pro) |
| | `gemini_multimodal_query` | Image + text input (Gemini's strength) |

## Install

Requires Node >=24.

```bash
git clone https://github.com/danielsimonjr/llm-providers-mcp.git
cd llm-providers-mcp
npm install
npm run build
```

## Configure keys

Keys live in environment variables only — never on disk inside this repo.

```powershell
# Windows PowerShell (persistent, per-user)
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-...", "User")
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "AIza...", "User")
```

Optional model overrides: `GEMINI_QUICK_MODEL`, `GEMINI_REASONING_MODEL`,
`OPENAI_QUICK_MODEL`, `OPENAI_REASONING_MODEL`.

## Register with Claude Code

```bash
claude mcp add -s user llm-openai -- node /abs/path/to/dist/openai/index.js
claude mcp add -s user llm-gemini -- node /abs/path/to/dist/gemini/index.js
claude mcp list
```

API keys are inherited from your shell environment — not written into any
config file.

## Slash commands

The repo ships two slash commands in `.claude/commands/` for quick one-shot
asks. After registering the MCP servers, either commit them per-project or
copy into `~/.claude/commands/` for global availability:

```bash
cp .claude/commands/*.md ~/.claude/commands/
```

| Command | What it does | Model |
|---|---|---|
| `/askGemini <question>` | Fast one-shot via `gemini_quick_query` | `gemini-2.5-flash` |
| `/askGeminiPro <question>` | Deep reasoning via `gemini_reasoning_query` | `gemini-2.5-pro` |
| `/askOpenAI <question>` | Fast one-shot via `openai_quick_query` | `gpt-4o-mini` |
| `/askOpenAIPro <question>` | Deep reasoning via `openai_reasoning_query` | `o3-mini` |

Each command includes a single-line model-name footer under the answer so you
know which provider and model responded.

## Verify standalone

Before registering with Claude Code, you can drive each server through the
MCP Inspector browser UI:

```bash
npx @modelcontextprotocol/inspector node dist/gemini/index.js
```

## Development

```bash
npm test          # vitest unit + smoke tests (no network)
npm run typecheck
npm run build
```

## How to add a provider

The one-sentence version: if the new provider is OpenAI-compatible, extend
`src/openai/` with a `baseURL` override; otherwise give it its own
`src/<provider>/` directory following the Gemini pattern.

## Background

The full build runbook is `LLM-Providers-MCP-Build-Runbook.md` — a phased
walkthrough of every design decision and the security reasoning behind key
handling. Architecture notes are in `docs/architecture.md`.

## Security

Read [`SECURITY.md`](SECURITY.md) before reporting a vulnerability.
Summary: keys must never appear in code, config files, commit messages, or
logs. If you find code that violates this, file a private security advisory.

## License

[MIT](LICENSE) © 2026 Daniel Simon Jr.
