# Multi-Provider MCP Servers — Claude Code Build Runbook

**What this is.** A runbook for Claude Code to build a set of local MCP
(Model Context Protocol) servers that let the user delegate work from
Claude Code to other LLM providers — OpenAI, Google Gemini, and
optionally others — through each provider's own official Agent SDK.

**Why this approach.** Instead of installing a third-party plugin like
`oh-my-openagent`, we build the thin integration layer ourselves. Every
line of code is auditable. The only external dependencies are the
official vendor SDKs (`@anthropic-ai/claude-agent-sdk`,
`openai-agents`, `google-genai`) and the MCP Python SDK. No
postinstall scripts, no telemetry, no supply-chain surprises.

**For Claude Code.** This is a phased runbook. Execute phases in order.
At every **🛑 STOP** gate, print your findings and wait for explicit
user approval before continuing. Do not batch phases.

**For the human.** Each phase explains what's about to happen and why.
If something goes sideways — unexpected network calls, credentials in
logs, "helpful" auto-install of extra packages — stop the agent and
reset.

---

## Rules of engagement (Claude Code, read this first)

1. **One phase at a time.** Run phase N, report, wait for "continue."
2. **Narrate before you act.** For each command or file-write: state
   what it does, then do it, then summarize the result.
3. **Never write API keys to disk.** Not in code, not in config files,
   not in commit messages, not in log output. Keys live in environment
   variables only. If the user provides a key, use it only in memory
   and never echo it back.
4. **No auto-publishing.** Don't push to GitHub, don't publish to PyPI,
   don't create Docker images. Local-only throughout.
5. **Stop if stuck.** If a dependency conflict, API error, or platform
   issue can't be resolved in two attempts, stop and hand back to the
   user with a clear diagnostic.

---

## Target architecture

```
mcp-providers/                    ← project root
├── .env.example                  ← documented env vars, no real keys
├── .gitignore                    ← excludes .env, __pycache__, .venv
├── pyproject.toml                ← single workspace, pinned deps
├── README.md                     ← human-facing docs
├── shared/                       ← cross-provider helpers
│   ├── __init__.py
│   ├── errors.py                 ← normalized error types
│   ├── formatting.py             ← JSON ↔ markdown response shaping
│   └── secrets.py                ← safe env-var loading, redaction
├── servers/
│   ├── openai_mcp/               ← OpenAI Agents SDK wrapper
│   │   ├── __init__.py
│   │   ├── server.py             ← FastMCP server + tool definitions
│   │   └── agent.py              ← OpenAI Agents SDK setup
│   ├── gemini_mcp/               ← Google GenAI wrapper
│   │   ├── __init__.py
│   │   ├── server.py
│   │   └── client.py
│   └── README.md                 ← how to add new providers
└── tests/
    ├── test_openai_smoke.py
    └── test_gemini_smoke.py
```

**Each MCP server exposes three tool categories:**

| Tool | Intent | Rough model tier |
|---|---|---|
| `{provider}_quick_query` | Fast, cheap one-shot | e.g. `gpt-4o-mini`, `gemini-2.5-flash` |
| `{provider}_reasoning_query` | Hard thinking, expensive | e.g. `o3`, `gemini-2.5-pro` |
| `{provider}_agent_run` | Multi-step agent with its own tools | e.g. OpenAI Agent, Gemini with function-calling |

Claude Code acts as the orchestrator. When it hits a task better suited
to GPT or Gemini, it calls the appropriate tool on the appropriate
server. Each provider stays in its own sandboxed process.

---

## Phase 1 — Environment check

**Goal:** confirm the machine can build Python packages and run
async code. Read-only.

```bash
uname -s -m
python3 --version          # expect 3.10+
which python3
pip --version
which uv 2>/dev/null || echo "no uv (optional, faster installer)"
which claude 2>/dev/null   # Claude Code CLI
claude --version 2>/dev/null || echo "claude not on PATH"
```

**Expected:**
- Python 3.10 or newer (OpenAI Agents SDK requires ≥ 3.10, Google GenAI
  requires ≥ 3.9, Claude Agent SDK requires ≥ 3.10).
- `pip` available. `uv` is optional but faster; prefer it if present.
- Claude Code CLI installed, since we'll wire into its MCP config later.

**🛑 STOP 1.** Report OS, Python version, whether `uv` is present, and
whether Claude Code is installed. Ask which install pathway to use
(`pip` vs `uv`) before proceeding.

---

## Phase 2 — API key intake

**Goal:** collect credentials from the user *without ever writing them
to a file* during the build.

**Human context:** This is the phase where things go wrong if an agent
is careless. Claude Code should ask for keys and then immediately stop
referencing them in prose. Keys should never appear in chat
transcripts, diffs, or shell history once we move forward.

Ask the user which providers they have keys for:

- OpenAI (`OPENAI_API_KEY`) — required for OpenAI MCP
- Google (`GEMINI_API_KEY` or `GOOGLE_API_KEY`) — required for Gemini MCP
- Anthropic (`ANTHROPIC_API_KEY`) — optional; only if using Anthropic
  through this harness (you're already on Claude Code, so usually no)
- xAI / Groq / Mistral / DeepSeek — optional; all of these speak the
  OpenAI-compatible API and can be added as variants of the OpenAI
  server later

Then tell the user to export the keys in the current shell:

```bash
# Example — user types these themselves, in their own terminal
export OPENAI_API_KEY='sk-...'
export GEMINI_API_KEY='AIza...'
# Verify without echoing:
[ -n "$OPENAI_API_KEY" ] && echo "OPENAI_API_KEY present (len ${#OPENAI_API_KEY})"
[ -n "$GEMINI_API_KEY" ] && echo "GEMINI_API_KEY present (len ${#GEMINI_API_KEY})"
```

**Claude Code: do not run `export`. Do not print key values. Do not
`env | grep`. Only ever check length, presence, or prefix (`sk-`,
`AIza`).**

**🛑 STOP 2.** Confirm which keys are present (by length only, not
value) and which providers we'll therefore build servers for. Wait for
the user to approve the provider list before scaffolding.

---

## Phase 3 — Scaffold the project

**Goal:** create the directory structure, `pyproject.toml`, `.gitignore`,
and `.env.example`. No provider code yet.

Start in a new directory the user chooses (default `~/mcp-providers`).
Confirm the path with the user before creating anything.

```bash
mkdir -p ~/mcp-providers && cd ~/mcp-providers
```

Create `pyproject.toml`:

```toml
[project]
name = "mcp-providers"
version = "0.1.0"
description = "Local MCP servers wrapping OpenAI, Gemini, and other LLM providers."
requires-python = ">=3.10"
dependencies = [
    "mcp[cli]>=1.2.0",
    "pydantic>=2.7",
    "python-dotenv>=1.0",
    "anyio>=4.4",
    # Provider SDKs are optional so unused servers don't force installs.
]

[project.optional-dependencies]
openai = ["openai-agents>=0.14", "openai>=1.50"]
gemini = ["google-genai>=1.0"]
anthropic = ["claude-agent-sdk>=0.2.111"]
dev = ["pytest>=8.0", "pytest-asyncio>=0.24", "ruff>=0.7"]

[project.scripts]
mcp-openai = "servers.openai_mcp.server:main"
mcp-gemini = "servers.gemini_mcp.server:main"

[tool.setuptools.packages.find]
include = ["shared*", "servers*"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

Create `.gitignore`:

```
.venv/
__pycache__/
*.pyc
.env
.env.*
!.env.example
.pytest_cache/
*.egg-info/
dist/
build/
```

Create `.env.example` — documented, no real values:

```
# Copy to .env for local dev (git-ignored) OR export in your shell.
# Never commit a real .env file.

OPENAI_API_KEY=
GEMINI_API_KEY=

# Optional model overrides. Defaults are set in each server's code.
OPENAI_QUICK_MODEL=gpt-4o-mini
OPENAI_REASONING_MODEL=o3-mini
GEMINI_QUICK_MODEL=gemini-2.5-flash
GEMINI_REASONING_MODEL=gemini-2.5-pro

# Hard limits to prevent runaway cost on a single call.
MCP_MAX_TOKENS=4096
MCP_REQUEST_TIMEOUT_SECONDS=120
```

Create the directory skeleton:

```bash
mkdir -p shared servers/openai_mcp servers/gemini_mcp tests
touch shared/__init__.py servers/__init__.py \
      servers/openai_mcp/__init__.py servers/gemini_mcp/__init__.py
```

Create a virtualenv and install the base dependencies (skip provider
extras until the relevant phase):

```bash
# With uv (preferred if available)
uv venv --python 3.11
source .venv/bin/activate
uv pip install -e .[dev]

# Or with pip
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

**🛑 STOP 3.** List the created files and confirm the virtualenv
activates cleanly. Wait before writing provider code.

---

## Phase 4 — Shared helpers

**Goal:** write the cross-provider utilities once so each server stays
small.

**Human context:** Every MCP server does the same three things at the
boundary — load a key, normalize an error, format a response. Extracting
those keeps each server file short enough to audit at a glance.

Create `shared/secrets.py`:

```python
"""Safe environment-variable loading with redaction helpers."""
from __future__ import annotations

import os
from typing import Optional


class MissingCredentialError(RuntimeError):
    """Raised when a required API key is not present in the environment."""


def require_env(name: str, *, hint: Optional[str] = None) -> str:
    value = os.environ.get(name)
    if not value:
        msg = f"Environment variable {name!r} is required but not set."
        if hint:
            msg += f" {hint}"
        raise MissingCredentialError(msg)
    return value


def env_or(name: str, default: str) -> str:
    value = os.environ.get(name)
    return value if value else default


def redact(value: str, *, keep: int = 4) -> str:
    """Return a redacted form of a secret, for safe logging."""
    if not value:
        return "<empty>"
    if len(value) <= keep:
        return "*" * len(value)
    return value[:keep] + "…" + "*" * 6
```

Create `shared/errors.py`:

```python
"""Normalized errors so MCP tool responses look the same across providers."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class ProviderError(Exception):
    provider: str
    kind: str           # "rate_limit" | "auth" | "timeout" | "invalid_request" | "unknown"
    message: str
    retry_after_seconds: Optional[float] = None

    def to_tool_response(self) -> dict:
        return {
            "ok": False,
            "error": {
                "provider": self.provider,
                "kind": self.kind,
                "message": self.message,
                "retry_after_seconds": self.retry_after_seconds,
            },
        }


def classify(provider: str, exc: Exception) -> ProviderError:
    """Best-effort classifier. Each server can extend for provider-specific cases."""
    msg = str(exc)
    lower = msg.lower()
    if "rate limit" in lower or "429" in lower:
        return ProviderError(provider, "rate_limit", msg)
    if "unauthorized" in lower or "401" in lower or "api key" in lower:
        return ProviderError(provider, "auth", msg)
    if "timeout" in lower or "timed out" in lower:
        return ProviderError(provider, "timeout", msg)
    if "invalid" in lower or "400" in lower:
        return ProviderError(provider, "invalid_request", msg)
    return ProviderError(provider, "unknown", msg)
```

Create `shared/formatting.py`:

```python
"""Uniform response shape for every tool across every provider."""
from __future__ import annotations

from typing import Any


def ok(data: Any, *, provider: str, model: str, usage: dict | None = None) -> dict:
    return {
        "ok": True,
        "provider": provider,
        "model": model,
        "usage": usage or {},
        "data": data,
    }
```

**🛑 STOP 4.** Run `python -c "from shared.secrets import redact; print(redact('sk-abcdef'))"` and confirm the output redacts correctly. Wait before building provider servers.

---

## Phase 5 — OpenAI MCP server

**Goal:** the reference implementation. Wraps the OpenAI Agents SDK
(`openai-agents`) and exposes three tools to Claude Code.

**Human context:** The OpenAI Agents SDK is provider-agnostic — it
handles the loop, tool execution, handoffs, and tracing. We're
building an MCP server whose tools *are themselves* OpenAI agents. So
when Claude Code calls `openai_agent_run(task=...)`, it triggers a
full OpenAI agent loop inside our MCP process, and gets the final
output back.

Install the provider extras:

```bash
pip install -e .[openai]          # or `uv pip install -e .[openai]`
```

Create `servers/openai_mcp/agent.py`:

```python
"""OpenAI agent construction. Separated from the MCP layer for testability."""
from __future__ import annotations

from agents import Agent, Runner  # from `openai-agents`

from shared.secrets import env_or


def build_quick_agent() -> Agent:
    return Agent(
        name="OpenAI Quick",
        model=env_or("OPENAI_QUICK_MODEL", "gpt-4o-mini"),
        instructions=(
            "You are a fast, direct assistant. "
            "Answer concisely. No preamble, no summaries, no filler."
        ),
    )


def build_reasoning_agent() -> Agent:
    return Agent(
        name="OpenAI Reasoning",
        model=env_or("OPENAI_REASONING_MODEL", "o3-mini"),
        instructions=(
            "You are a careful reasoner. Think step by step when the problem "
            "demands it. Prefer correctness over speed."
        ),
    )


def build_generalist_agent() -> Agent:
    """The 'do a whole task' agent. Can be extended with tools."""
    return Agent(
        name="OpenAI Generalist",
        model=env_or("OPENAI_REASONING_MODEL", "o3-mini"),
        instructions=(
            "You are an autonomous worker. You will receive a task from another "
            "agent (Claude). Complete the task end-to-end. If the task is "
            "ambiguous, note your assumptions and proceed. Return a complete, "
            "self-contained result."
        ),
    )


async def run_agent(agent: Agent, prompt: str) -> tuple[str, dict]:
    """Run an agent and return (final_output, usage_dict)."""
    result = await Runner.run(agent, prompt)
    usage = {}
    try:
        # The SDK exposes token usage on the result context.
        usage = dict(result.usage) if hasattr(result, "usage") else {}
    except Exception:
        usage = {}
    return (result.final_output or "", usage)
```

Create `servers/openai_mcp/server.py`:

```python
"""MCP server exposing OpenAI Agents SDK as tools for Claude Code."""
from __future__ import annotations

from typing import Annotated

from mcp.server.fastmcp import FastMCP
from pydantic import Field

from shared.errors import classify
from shared.formatting import ok
from shared.secrets import require_env, env_or

from .agent import (
    build_generalist_agent,
    build_quick_agent,
    build_reasoning_agent,
    run_agent,
)

# Asserts the key exists at import time — fail fast, not at first tool call.
require_env(
    "OPENAI_API_KEY",
    hint="Get one from https://platform.openai.com/api-keys and `export` it.",
)

mcp = FastMCP("openai-mcp")


@mcp.tool()
async def openai_quick_query(
    prompt: Annotated[str, Field(description="The question or task.")],
) -> dict:
    """Fast, cheap one-shot query to a small OpenAI model.

    Use for: short factual lookups, quick rewrites, format conversions,
    classifications. Not for multi-step reasoning.
    """
    agent = build_quick_agent()
    try:
        text, usage = await run_agent(agent, prompt)
    except Exception as exc:
        return classify("openai", exc).to_tool_response()
    return ok(text, provider="openai", model=agent.model, usage=usage)


@mcp.tool()
async def openai_reasoning_query(
    prompt: Annotated[str, Field(description="The problem to reason about.")],
) -> dict:
    """Deep-reasoning query to a frontier OpenAI reasoning model.

    Use for: architecture questions, hard bugs, debugging, anything that
    benefits from step-by-step thinking. Slower and more expensive.
    """
    agent = build_reasoning_agent()
    try:
        text, usage = await run_agent(agent, prompt)
    except Exception as exc:
        return classify("openai", exc).to_tool_response()
    return ok(text, provider="openai", model=agent.model, usage=usage)


@mcp.tool()
async def openai_agent_run(
    task: Annotated[str, Field(description="A complete task description.")],
) -> dict:
    """Hand an end-to-end task to an autonomous OpenAI agent.

    Use for: tasks you'd rather delegate entirely. The agent will reason,
    optionally call its own tools, and return a final result. More
    expensive than a query — reserve for work that needs real
    autonomy.
    """
    agent = build_generalist_agent()
    try:
        text, usage = await run_agent(agent, task)
    except Exception as exc:
        return classify("openai", exc).to_tool_response()
    return ok(text, provider="openai", model=agent.model, usage=usage)


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
```

Validate it compiles:

```bash
python -m py_compile servers/openai_mcp/server.py servers/openai_mcp/agent.py
```

**🛑 STOP 5.** Confirm compilation. Ask the user whether to run a live
smoke test against OpenAI's API (which will cost a few cents) or wait
until all servers are built. If yes, run:

```bash
python -c "
import asyncio
from servers.openai_mcp.agent import build_quick_agent, run_agent
print(asyncio.run(run_agent(build_quick_agent(), 'Reply with exactly the word pong.')))
"
```

Expect output containing `pong`.

---

## Phase 6 — Gemini MCP server

**Goal:** the same three-tool pattern, wrapped around the Google
GenAI SDK.

**Human context:** Google's SDK situation has been messy — the
`google-generativeai` package is now *deprecated* in favor of the
unified `google-genai` package. We use the new one. If Claude Code
wants to install `google-generativeai`, stop it.

Install the provider extras:

```bash
pip install -e .[gemini]
```

Create `servers/gemini_mcp/client.py`:

```python
"""Thin Gemini client built on the unified google-genai SDK."""
from __future__ import annotations

from google import genai
from google.genai import types

from shared.secrets import env_or, require_env


def build_client() -> genai.Client:
    # google-genai reads GEMINI_API_KEY (or GOOGLE_API_KEY) from the env
    # automatically, but we assert presence first so failure is clear.
    require_env(
        "GEMINI_API_KEY",
        hint="Get one from https://aistudio.google.com/apikey and `export` it.",
    )
    return genai.Client()


async def generate(
    prompt: str,
    *,
    model: str,
    max_output_tokens: int = 4096,
    system_instruction: str | None = None,
) -> tuple[str, dict]:
    client = build_client()
    config = types.GenerateContentConfig(
        max_output_tokens=max_output_tokens,
        system_instruction=system_instruction,
    )
    response = await client.aio.models.generate_content(
        model=model,
        contents=prompt,
        config=config,
    )
    usage: dict = {}
    try:
        md = response.usage_metadata
        if md:
            usage = {
                "input_tokens": md.prompt_token_count,
                "output_tokens": md.candidates_token_count,
                "total_tokens": md.total_token_count,
            }
    except Exception:
        pass
    return (response.text or "", usage)
```

Create `servers/gemini_mcp/server.py`:

```python
"""MCP server exposing Google Gemini as tools for Claude Code."""
from __future__ import annotations

from typing import Annotated

from mcp.server.fastmcp import FastMCP
from pydantic import Field

from shared.errors import classify
from shared.formatting import ok
from shared.secrets import env_or

from .client import generate

mcp = FastMCP("gemini-mcp")

QUICK_MODEL = env_or("GEMINI_QUICK_MODEL", "gemini-2.5-flash")
REASONING_MODEL = env_or("GEMINI_REASONING_MODEL", "gemini-2.5-pro")


@mcp.tool()
async def gemini_quick_query(
    prompt: Annotated[str, Field(description="The question or task.")],
) -> dict:
    """Fast, cheap one-shot query to Gemini Flash.

    Use for: short factual lookups, creative phrasing, quick synthesis.
    """
    try:
        text, usage = await generate(
            prompt,
            model=QUICK_MODEL,
            system_instruction=(
                "You are a fast, direct assistant. "
                "Answer concisely. No preamble."
            ),
        )
    except Exception as exc:
        return classify("gemini", exc).to_tool_response()
    return ok(text, provider="gemini", model=QUICK_MODEL, usage=usage)


@mcp.tool()
async def gemini_reasoning_query(
    prompt: Annotated[str, Field(description="The problem to reason about.")],
) -> dict:
    """Deep reasoning via Gemini Pro.

    Use for: multi-step analysis, hard logic, anything where Gemini's
    distinct reasoning style is a useful second opinion to Claude's.
    """
    try:
        text, usage = await generate(
            prompt,
            model=REASONING_MODEL,
            system_instruction=(
                "You are a careful reasoner. Prefer correctness over speed."
            ),
        )
    except Exception as exc:
        return classify("gemini", exc).to_tool_response()
    return ok(text, provider="gemini", model=REASONING_MODEL, usage=usage)


@mcp.tool()
async def gemini_multimodal_query(
    prompt: Annotated[str, Field(description="The text part of the prompt.")],
    image_paths: Annotated[
        list[str] | None,
        Field(
            description="Optional list of local image file paths to include.",
            default=None,
        ),
    ] = None,
) -> dict:
    """Multimodal query — Gemini's traditional strength.

    Use for: screenshot analysis, diagram interpretation, OCR,
    frontend review from a mockup.
    """
    # Implementation detail: read each image, attach as types.Part.
    # Kept short here; fill in when multimodal is actually needed.
    from pathlib import Path

    from google.genai import types

    from .client import build_client

    client = build_client()
    parts: list = [prompt]
    for p in image_paths or []:
        data = Path(p).read_bytes()
        mime = "image/png" if p.lower().endswith(".png") else "image/jpeg"
        parts.append(types.Part.from_bytes(data=data, mime_type=mime))
    try:
        response = await client.aio.models.generate_content(
            model=QUICK_MODEL,
            contents=parts,
        )
    except Exception as exc:
        return classify("gemini", exc).to_tool_response()
    return ok(response.text or "", provider="gemini", model=QUICK_MODEL)


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
```

Validate it compiles:

```bash
python -m py_compile servers/gemini_mcp/server.py servers/gemini_mcp/client.py
```

**🛑 STOP 6.** Same options as Phase 5 — compile-only, or live smoke
test against the Gemini API. If live:

```bash
python -c "
import asyncio
from servers.gemini_mcp.client import generate
print(asyncio.run(generate('Reply with exactly the word pong.', model='gemini-2.5-flash'))[0])
"
```

---

## Phase 7 — Local testing with MCP Inspector

**Goal:** verify each MCP server works in isolation before wiring it
into Claude Code. MCP Inspector is the official debugging tool.

**Human context:** If a server is broken, we want to know before it
hits Claude Code. Inspector gives a web UI where you can call each tool
directly.

```bash
# Installs into an ephemeral npx cache, nothing global.
npx @modelcontextprotocol/inspector python -m servers.openai_mcp.server
```

Inspector opens in the browser. For each server:

1. Confirm the tool list matches what the code defines.
2. Call `*_quick_query` with `"Reply with the word pong."` and confirm
   the response comes back.
3. Check the request/response panels for anything that looks wrong —
   missing fields, leaked secrets, stack traces.

Repeat for `python -m servers.gemini_mcp.server`.

**🛑 STOP 7.** Report tool lists and any errors. Wait before wiring to
Claude Code.

---

## Phase 8 — Register with Claude Code

**Goal:** add the servers to Claude Code's MCP configuration so Claude
Code can call them.

**Human context:** Claude Code reads MCP servers from a JSON config.
We add entries that tell Claude Code: *"run this Python module with
this env, speak MCP over stdio to it."*

The config location depends on the user's OS and Claude Code version.
Common locations (ask if unsure):

- **User-scoped (recommended for this):** `~/.claude/mcp.json` or
  `~/.config/claude-code/mcp.json`
- **Project-scoped:** `.mcp.json` in the project root

Show the user the config you propose to add, then ask for approval:

```jsonc
{
  "mcpServers": {
    "openai": {
      "command": "/absolute/path/to/mcp-providers/.venv/bin/python",
      "args": ["-m", "servers.openai_mcp.server"],
      "cwd": "/absolute/path/to/mcp-providers",
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}",
        "OPENAI_QUICK_MODEL": "gpt-4o-mini",
        "OPENAI_REASONING_MODEL": "o3-mini"
      }
    },
    "gemini": {
      "command": "/absolute/path/to/mcp-providers/.venv/bin/python",
      "args": ["-m", "servers.gemini_mcp.server"],
      "cwd": "/absolute/path/to/mcp-providers",
      "env": {
        "GEMINI_API_KEY": "${GEMINI_API_KEY}",
        "GEMINI_QUICK_MODEL": "gemini-2.5-flash",
        "GEMINI_REASONING_MODEL": "gemini-2.5-pro"
      }
    }
  }
}
```

**Key points:**

- `command` points at the **project's virtualenv Python**, not the
  system Python. This guarantees the right deps.
- `env` interpolates `${OPENAI_API_KEY}` etc. from the user's shell
  environment at Claude Code launch time — the keys are *not written
  into the config file*.
- Use **absolute paths** for `command` and `cwd`. Claude Code does not
  expand `~` or relative paths reliably across versions.

**🛑 STOP 8.** Confirm the config file path, show a diff of what will
be added, and wait for approval before writing.

After approval: restart Claude Code (`claude` session must be
restarted to pick up MCP config changes).

---

## Phase 9 — End-to-end test from Claude Code

**Goal:** prove the whole pipeline works.

Ask the user to open a fresh Claude Code session (in a throwaway
directory is fine) and try:

```
Ask GPT for a one-sentence explanation of why Python's GIL exists.
Then ask Gemini for its own one-sentence answer. Compare them.
```

Claude Code should:
1. Detect that `openai_*` and `gemini_*` tools are available.
2. Call `openai_quick_query` with an appropriate prompt.
3. Call `gemini_quick_query` with the same prompt.
4. Synthesize a comparison in its own response.

If any step fails, check:
- `claude mcp list` — is the server connected?
- `claude mcp logs openai` — any stack traces?
- Env vars present in the shell that launched Claude Code?

**🛑 STOP 9.** Report pass/fail. Done.

---

## Extending to more providers

Each new provider follows the same pattern. The usual ones:

| Provider | SDK / endpoint | Pattern |
|---|---|---|
| **xAI (Grok)** | OpenAI-compatible API at `https://api.x.ai/v1` | Reuse OpenAI SDK with `base_url` override. Add a 4th tool to the OpenAI server or create a sibling server. |
| **Groq** | OpenAI-compatible API at `https://api.groq.com/openai/v1` | Same pattern. Useful for speed — Groq hosts Llama at very high throughput. |
| **DeepSeek** | OpenAI-compatible API at `https://api.deepseek.com/v1` | Same pattern. |
| **Mistral** | `mistralai` Python SDK | Same structure as Gemini server. |
| **Local (Ollama)** | OpenAI-compatible API at `http://localhost:11434/v1` | Great for free routing of cheap tasks. No key needed. |

The rule: if the provider is OpenAI-compatible, you extend the OpenAI
server. If it has its own SDK with materially different ergonomics,
you give it its own server.

---

## Security checklist

Before the user puts this into real use, confirm:

- [ ] `.env` is in `.gitignore` and has never been committed.
- [ ] No API keys appear in any Python file, Markdown file, or shell
      history (`grep -r 'sk-' .` should find nothing inside the repo).
- [ ] The virtualenv is owned by the user, not root.
- [ ] Env vars are exported in a shell profile with `chmod 600`
      permissions (e.g., `~/.zshrc`, `~/.config/fish/config.fish`).
- [ ] If the user uses a shared machine, consider a secrets manager
      (`pass`, `1password-cli`, `aws ssm`) instead of shell exports.

---

## What you've built vs. what oh-my-openagent was

| | oh-my-openagent | This |
|---|---|---|
| Lines of code you own | ~0 (plugin opaque) | a few hundred, all auditable |
| Supply chain | 3+ npm packages + transitive deps + postinstall binary | 4 pinned Python packages (`mcp`, `openai-agents`, `google-genai`, SDK extras) |
| Telemetry | PostHog, opt-out | None |
| Prompt injection in docs | Yes | No |
| Multi-provider orchestration | Yes, via their agent system | Yes, via Claude Code's native MCP tool-use |
| Works offline | No | Partially (Ollama for local models) |
| Can you fix bugs | Fork-and-rebase hell | Edit the file |

---

## When to use which provider tool

A rough heuristic Claude Code can internalize:

- **Fast factual, rewriting, classification:** `*_quick_query` against
  the cheapest model. Often `gemini-2.5-flash` since it's both fast
  and cheap.
- **Architecture, hard debugging, math, formal reasoning:**
  `openai_reasoning_query` with an o-series model. The reasoning
  models genuinely think differently than Claude.
- **Second opinion / diverse-perspective synthesis:** call *both*
  `openai_reasoning_query` and `gemini_reasoning_query` and compare.
  You get a crude ensemble.
- **Frontend / vision / screenshots:** `gemini_multimodal_query`.
  Gemini is historically strongest here.
- **Delegated multi-step task:** `openai_agent_run` — lets an OpenAI
  agent loop with its own tools, returns just the final result. Use
  when you want to offload a whole subgoal.
- **Everything else:** stay in Claude Code. You're already there.
