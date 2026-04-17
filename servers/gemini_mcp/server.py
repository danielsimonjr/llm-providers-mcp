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
        text, usage = await generate(
            prompt,
            model=REASONING_MODEL,
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
