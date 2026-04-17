# llm-providers-mcp

Local MCP servers that let Claude Code delegate work to OpenAI and Google Gemini
through each provider's own official Agent SDK.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python: 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](pyproject.toml)

No third-party plugin, no telemetry, no postinstall scripts. Every line is
yours to audit. Built against the MCP Python SDK and the official provider
SDKs (`openai-agents`, `google-genai`).

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

Requires Python ≥3.10 and [`uv`](https://github.com/astral-sh/uv) (or plain `pip`).

```bash
git clone https://github.com/danielsimonjr/llm-providers-mcp.git
cd llm-providers-mcp
uv venv --python 3.13
source .venv/Scripts/activate    # Windows Git Bash
# or: .venv\Scripts\Activate.ps1  (PowerShell)
uv pip install -e ".[openai,gemini,dev]"
```

## Configure keys

Keys live in environment variables only — never on disk inside this repo.

```bash
# Linux/macOS/Git Bash
export OPENAI_API_KEY='sk-...'
export GEMINI_API_KEY='AIza...'
```

```powershell
# Windows PowerShell (persistent, per-user)
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-...", "User")
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "AIza...", "User")
```

See `.env.example` for the full list of supported env vars (model overrides,
timeouts).

## Register with Claude Code

```bash
claude mcp add -s user llm-openai -- /abs/path/to/.venv/Scripts/python.exe -m servers.openai_mcp.server
claude mcp add -s user llm-gemini -- /abs/path/to/.venv/Scripts/python.exe -m servers.gemini_mcp.server
claude mcp list   # should show both ✓ Connected
```

Restart Claude Code so it picks up the new servers. API keys are inherited
from your shell environment — not written into any config file.

## Slash commands

The repo ships two slash commands in `.claude/commands/` for quick one-shot
asks. After registering the MCP servers, either commit them per-project or
copy into `~/.claude/commands/` for global availability:

```bash
cp .claude/commands/*.md ~/.claude/commands/
```

| Command | What it does | Model |
|---|---|---|
| `/askGemini <question>` | Routes your prompt to `gemini_quick_query` and shows the answer | `gemini-2.5-flash` |
| `/askOpenAI <question>` | Routes your prompt to `openai_quick_query` and shows the answer | `gpt-4o-mini` |

Each command includes a single-line model-name footer under the answer so you
know which provider and model responded.

## Verify standalone

Before registering with Claude Code, you can drive each server through the
MCP Inspector browser UI:

```bash
npx @modelcontextprotocol/inspector ./.venv/Scripts/python.exe -m servers.openai_mcp.server
```

## Development

```bash
uv pip install -e ".[dev]"
pytest                      # unit tests (no network)
pytest -m integration       # integration tests (requires keys, spends $)
ruff check .
ruff format .
```

## How to add a provider

See [`servers/README.md`](servers/README.md). The one-sentence version: if the
new provider is OpenAI-compatible, extend `servers/openai_mcp` with a
`base_url` override; otherwise give it its own `servers/<provider>_mcp/`
directory following the Gemini pattern.

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
