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
