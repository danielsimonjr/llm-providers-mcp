# llm-providers-mcp

Local MCP servers that let Claude Code delegate work to OpenAI and Google Gemini
through each provider's own official Agent SDK.

[![CI](https://github.com/danielsimonjr/llm-providers-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/danielsimonjr/llm-providers-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Bun: >=1.4](https://img.shields.io/badge/bun-%3E%3D1.4-fbf0df.svg)](package.json)
[![Node: >=24](https://img.shields.io/badge/node-%3E%3D24-blue.svg)](package.json)

No third-party plugin, no telemetry, no postinstall scripts. Every line is
yours to audit. Built against the MCP TypeScript SDK v2 (`@modelcontextprotocol/server`,
protocol revision **2026-07-28** with legacy `initialize` fallback) and the official
provider SDKs (`@openai/agents`, `@google/genai`).

**Toolchain:** TypeScript on Bun (`bun install`, `bun test`, `bun run build`).
**Shipped runtime:** Node — Claude Code plugins launch the bundled servers with
`node` (long-lived MCP stdio processes stay on Node by design).

## Skills

`llm-openai` also ships an `openai` skill (`llm-openai:openai`, `/openai`) and
`llm-gemini` ships a `gemini` skill (`llm-gemini:gemini`, `/gemini`) —
playbooks over the quick/reasoning query tools; see the respective
`plugins/*/skills/*/SKILL.md`.

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

Requires [Bun](https://bun.sh) >=1.4 (toolchain) and Node >=24 (to run the
compiled servers / Claude Code plugins).

```bash
git clone https://github.com/danielsimonjr/llm-providers-mcp.git
cd llm-providers-mcp
bun install
bun run build
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
bunx @modelcontextprotocol/inspector node dist/gemini/index.js
```

## Development

```bash
bun test          # bun:test unit + smoke tests (no network)
bun run typecheck
bun run build
bun run bundle    # rebuild plugins/*/bundle/index.mjs
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
