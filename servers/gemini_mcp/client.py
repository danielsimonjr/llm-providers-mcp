"""Thin Gemini client built on the unified google-genai SDK."""

from __future__ import annotations

from google import genai
from google.genai import types

from shared.secrets import require_env


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
