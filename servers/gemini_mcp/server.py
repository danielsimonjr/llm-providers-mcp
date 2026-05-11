"""MCP server exposing Google Gemini as tools for Claude Code."""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import Annotated

# --- Startup heartbeat (instrumentation) ----------------------------
#
# The MCP stdio transport eats stderr by default, hiding crashes that
# happen between process spawn and the FastMCP handshake. This block
# writes a one-line heartbeat to ~/.claude/llm-gemini-startup.log
# AT IMPORT TIME so we can tell — out-of-band — whether the host
# actually spawned us. If the file timestamp doesn't advance after a
# /reload-plugins, the host never spawned us (vs spawn + die early).
#
# Best-effort: a write failure here must not block the server. Any
# exception is swallowed so we don't introduce a new failure mode.
try:
    _log_path = Path.home() / ".claude" / "llm-gemini-startup.log"
    _log_path.parent.mkdir(parents=True, exist_ok=True)
    with _log_path.open("a", encoding="utf-8") as _f:
        _f.write(
            f"{time.strftime('%Y-%m-%dT%H:%M:%S')} "
            f"pid={os.getpid()} "
            f"key_present={'GEMINI_API_KEY' in os.environ} "
            f"python={sys.version_info[:3]}\n"
        )
except Exception:
    pass
# --- End heartbeat ---------------------------------------------------

from mcp.server.fastmcp import FastMCP
from pydantic import Field

from shared.errors import classify
from shared.formatting import ok
from shared.secrets import env_or, require_env

# Asserts the key exists at import time — fail fast, not at first tool
# call. Mirrors the OpenAI server's pattern (servers/openai_mcp/server.py).
# Without this, a missing GEMINI_API_KEY produces a silent late failure
# inside `client.generate()`, after the FastMCP handshake has already
# advertised the tools but they all error on first use.
require_env(
    "GEMINI_API_KEY",
    hint="Get one from https://aistudio.google.com/apikey and `export` it.",
)

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
        # Flash supports `thinking_budget=0` to disable thinking entirely;
        # quick queries don't need reasoning overhead.
        text, usage = await generate(
            prompt,
            model=QUICK_MODEL,
            max_output_tokens=8192,
            thinking_budget=0,
            temperature=0.2,
            system_instruction=("You are a fast, direct assistant. Answer concisely. No preamble."),
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
        # Pro CANNOT disable thinking (per Gemini docs) but the budget can
        # be capped. With the prior default (max_output_tokens=4096, no
        # thinking_config) Pro silently returned empty text because dynamic
        # thinking consumed the entire budget. Cap thinking at 8192 and
        # raise output cap to 32768 so output has guaranteed headroom.
        text, usage = await generate(
            prompt,
            model=REASONING_MODEL,
            max_output_tokens=32768,
            thinking_budget=8192,
            temperature=0.2,
            system_instruction=("You are a careful reasoner. Prefer correctness over speed."),
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
