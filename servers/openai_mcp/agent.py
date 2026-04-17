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
    """Run an agent and return (final_output, usage_dict).

    openai-agents exposes token usage at result.context_wrapper.usage as a
    Usage dataclass. We normalize it to the same shape our Gemini client
    returns so the MCP tool response stays consistent across providers.
    """
    result = await Runner.run(agent, prompt)
    usage: dict = {}
    try:
        raw = result.context_wrapper.usage
        usage = {
            "input_tokens": raw.input_tokens,
            "output_tokens": raw.output_tokens,
            "total_tokens": raw.total_tokens,
            "requests": raw.requests,
        }
        reasoning = getattr(raw.output_tokens_details, "reasoning_tokens", 0)
        if reasoning:
            usage["reasoning_tokens"] = reasoning
        cached = getattr(raw.input_tokens_details, "cached_tokens", 0)
        if cached:
            usage["cached_tokens"] = cached
    except Exception:
        # Defensive: if the SDK reshapes this in a future version, degrade
        # gracefully rather than crash the tool call.
        usage = {}
    return (result.final_output or "", usage)
