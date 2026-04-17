"""Safe environment-variable loading with redaction helpers."""

from __future__ import annotations

import os


class MissingCredentialError(RuntimeError):
    """Raised when a required API key is not present in the environment."""


def require_env(name: str, *, hint: str | None = None) -> str:
    value = os.environ.get(name)
    if not value:
        msg = f"Environment variable {name!r} is required but not set."
        if hint:
            msg += f" {hint}"
        raise MissingCredentialError(msg)
    return value


def env_or(name: str, default: str) -> str:
    value = os.environ.get(name)
    return value if value else default


def redact(value: str, *, keep: int = 4) -> str:
    """Return a redacted form of a secret, for safe logging."""
    if not value:
        return "<empty>"
    if len(value) <= keep:
        return "*" * len(value)
    return value[:keep] + "..." + "*" * 6
