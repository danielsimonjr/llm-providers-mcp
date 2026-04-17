"""Normalized errors so MCP tool responses look the same across providers."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ProviderError(Exception):
    provider: str
    kind: str  # "rate_limit" | "auth" | "timeout" | "invalid_request" | "unknown"
    message: str
    retry_after_seconds: float | None = None

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
