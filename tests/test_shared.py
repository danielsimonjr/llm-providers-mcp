"""Unit tests for the shared helper modules. No network, no keys required."""

from __future__ import annotations

import pytest

from shared.errors import ProviderError, classify
from shared.formatting import ok
from shared.secrets import MissingCredentialError, env_or, redact, require_env


class TestRedact:
    def test_long_value_keeps_prefix_and_masks(self):
        result = redact("sk-abcdef1234567890")
        assert result.startswith("sk-a")
        assert "*" in result
        assert "abcdef1234567890" not in result

    def test_short_value_fully_masked(self):
        assert redact("abc") == "***"

    def test_empty_value(self):
        assert redact("") == "<empty>"

    def test_custom_keep_length(self):
        result = redact("sk-abcdef", keep=2)
        assert result.startswith("sk")
        assert "abcdef" not in result

    def test_no_key_material_in_output_ascii_only(self):
        # Ensure the output is printable ASCII so it won't mojibake on Windows
        result = redact("sk-proj-" + "x" * 150)
        assert all(ord(c) < 128 for c in result)


class TestEnvHelpers:
    def test_require_env_returns_value_when_set(self, monkeypatch):
        monkeypatch.setenv("TEST_VAR_PRESENT", "hello")
        assert require_env("TEST_VAR_PRESENT") == "hello"

    def test_require_env_raises_when_missing(self, monkeypatch):
        monkeypatch.delenv("TEST_VAR_MISSING", raising=False)
        with pytest.raises(MissingCredentialError):
            require_env("TEST_VAR_MISSING")

    def test_require_env_includes_hint_in_message(self, monkeypatch):
        monkeypatch.delenv("TEST_VAR_MISSING", raising=False)
        with pytest.raises(MissingCredentialError, match="go get one at"):
            require_env("TEST_VAR_MISSING", hint="go get one at example.com")

    def test_env_or_returns_value_when_set(self, monkeypatch):
        monkeypatch.setenv("TEST_VAR", "real")
        assert env_or("TEST_VAR", "default") == "real"

    def test_env_or_returns_default_when_missing(self, monkeypatch):
        monkeypatch.delenv("TEST_VAR", raising=False)
        assert env_or("TEST_VAR", "default") == "default"

    def test_env_or_returns_default_when_empty_string(self, monkeypatch):
        monkeypatch.setenv("TEST_VAR", "")
        assert env_or("TEST_VAR", "default") == "default"


class TestClassify:
    @pytest.mark.parametrize(
        "message,expected_kind",
        [
            ("Rate limit exceeded", "rate_limit"),
            ("429 Too Many Requests", "rate_limit"),
            ("Unauthorized", "auth"),
            ("401 Forbidden", "auth"),
            ("Invalid API key provided", "auth"),
            ("Request timed out", "timeout"),
            ("connection timeout", "timeout"),
            ("Invalid request payload", "invalid_request"),
            ("400 Bad Request", "invalid_request"),
            ("Some unknown weird glitch", "unknown"),
        ],
    )
    def test_classifier_routes_to_expected_kind(self, message, expected_kind):
        err = classify("test-provider", RuntimeError(message))
        assert err.kind == expected_kind
        assert err.provider == "test-provider"

    def test_to_tool_response_shape(self):
        err = classify("openai", RuntimeError("Rate limit exceeded"))
        response = err.to_tool_response()
        assert response["ok"] is False
        assert response["error"]["provider"] == "openai"
        assert response["error"]["kind"] == "rate_limit"
        assert "message" in response["error"]
        assert "retry_after_seconds" in response["error"]


class TestOk:
    def test_minimal_response(self):
        response = ok("pong", provider="test", model="test-1")
        assert response["ok"] is True
        assert response["provider"] == "test"
        assert response["model"] == "test-1"
        assert response["data"] == "pong"
        assert response["usage"] == {}

    def test_with_usage(self):
        response = ok(
            "result",
            provider="openai",
            model="gpt-4o-mini",
            usage={"input_tokens": 10, "output_tokens": 5},
        )
        assert response["usage"]["input_tokens"] == 10
        assert response["usage"]["output_tokens"] == 5

    def test_data_can_be_any_type(self):
        for value in ["string", 42, {"nested": "dict"}, [1, 2, 3], None]:
            response = ok(value, provider="test", model="m")
            assert response["data"] == value

    def test_missing_usage_defaults_to_empty_dict(self):
        response = ok("x", provider="p", model="m", usage=None)
        assert response["usage"] == {}


class TestProviderErrorDataclass:
    def test_is_exception(self):
        err = ProviderError("test", "unknown", "something broke")
        assert isinstance(err, Exception)

    def test_optional_retry_after_defaults_to_none(self):
        err = ProviderError("test", "rate_limit", "slow down")
        assert err.retry_after_seconds is None

    def test_retry_after_populated(self):
        err = ProviderError("test", "rate_limit", "slow down", retry_after_seconds=5.0)
        assert err.retry_after_seconds == 5.0
