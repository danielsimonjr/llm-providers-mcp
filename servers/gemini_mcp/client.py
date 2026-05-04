"""Thin Gemini client built on the unified google-genai SDK.

`google.genai` import is deferred to call time — at module top it costs
~3s on this machine, which exceeds the MCP plugin host's startup-handshake
budget (causes `× failed` in /mcp). Lazy-loading lets the server register
its tool surface in <500ms; the SDK only loads on the first tool call.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from shared.secrets import require_env

if TYPE_CHECKING:
    # type-only import — never executed at runtime
    from google import genai


def build_client() -> "genai.Client":
    # google-genai reads GEMINI_API_KEY (or GOOGLE_API_KEY) from the env
    # automatically, but we assert presence first so failure is clear.
    require_env(
        "GEMINI_API_KEY",
        hint="Get one from https://aistudio.google.com/apikey and `export` it.",
    )
    from google import genai  # lazy: see module docstring
    return genai.Client()


async def generate(
    prompt: str,
    *,
    model: str,
    max_output_tokens: int = 4096,
    system_instruction: str | None = None,
) -> tuple[str, dict]:
    from google.genai import types  # lazy: see module docstring
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
