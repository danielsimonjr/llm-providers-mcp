"""Thin Gemini client built on the unified google-genai SDK.

`google.genai` import is deferred to call time — at module top it costs
~3s on this machine, which exceeds the MCP plugin host's startup-handshake
budget (causes `× failed` in /mcp). Lazy-loading lets the server register
its tool surface in <500ms; the SDK only loads on the first tool call.

Thinking-budget context (2026-05-07):

Gemini 2.5+ models have "thinking" enabled and consume thinking tokens
out of `max_output_tokens`. With no `thinking_config` and a default
`max_output_tokens=4096`, Pro can spend the entire budget on thinking
and return `response.text == ""` with `finish_reason=MAX_TOKENS` — a
silent failure. `_build_config` exposes `thinking_budget` (cap) and
`temperature`; `server.py` sets per-tool defaults appropriate for
quick (Flash, budget=0) vs reasoning (Pro, budget=8192) calls.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from shared.secrets import require_env

if TYPE_CHECKING:
    # type-only import — never executed at runtime
    from google import genai
    from google.genai import types as genai_types


def build_client() -> "genai.Client":
    # google-genai reads GEMINI_API_KEY (or GOOGLE_API_KEY) from the env
    # automatically, but we assert presence first so failure is clear.
    require_env(
        "GEMINI_API_KEY",
        hint="Get one from https://aistudio.google.com/apikey and `export` it.",
    )
    from google import genai  # lazy: see module docstring
    return genai.Client()


def _build_config(
    *,
    max_output_tokens: int,
    thinking_budget: int | None,
    temperature: float | None,
    system_instruction: str | None,
) -> "genai_types.GenerateContentConfig":
    """Construct a GenerateContentConfig with optional thinking/temperature.

    Extracted as a separate helper so unit tests can pin field passthrough
    without making a network call.

    `thinking_budget` semantics (per Gemini docs):
      - None: SDK default ("Dynamic thinking" on 2.5 Pro, equivalent to -1)
      - 0: disable thinking (supported on 2.5 Flash; NOT on 2.5 Pro)
      - 128-32768: cap thinking-token spend (works on Pro and Flash)
    """
    from google.genai import types  # lazy: see module docstring
    thinking_config = (
        types.ThinkingConfig(thinking_budget=thinking_budget)
        if thinking_budget is not None
        else None
    )
    return types.GenerateContentConfig(
        max_output_tokens=max_output_tokens,
        system_instruction=system_instruction,
        thinking_config=thinking_config,
        temperature=temperature,
    )


async def generate(
    prompt: str,
    *,
    model: str,
    max_output_tokens: int = 8192,
    thinking_budget: int | None = None,
    temperature: float | None = None,
    system_instruction: str | None = None,
) -> tuple[str, dict]:
    client = build_client()
    config = _build_config(
        max_output_tokens=max_output_tokens,
        thinking_budget=thinking_budget,
        temperature=temperature,
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
            # thoughts_token_count was added in google-genai 1.x; missing on
            # older SDKs, hence getattr-with-default rather than direct access.
            thoughts = getattr(md, "thoughts_token_count", None)
            if thoughts is not None:
                usage["thoughts_tokens"] = thoughts
        # finish_reason exposes the silent-truncation case (MAX_TOKENS with
        # empty .text when thinking eats the budget). Surface it for debugging.
        if response.candidates:
            fr = getattr(response.candidates[0], "finish_reason", None)
            if fr is not None:
                usage["finish_reason"] = str(fr)
    except Exception:
        pass
    return (response.text or "", usage)
