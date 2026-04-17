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
