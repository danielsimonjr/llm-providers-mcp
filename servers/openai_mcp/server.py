"""MCP server exposing OpenAI Agents SDK as tools for Claude Code."""

from __future__ import annotations

from typing import Annotated

from mcp.server.fastmcp import FastMCP
from pydantic import Field

from shared.errors import classify
from shared.formatting import ok
from shared.secrets import require_env

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
