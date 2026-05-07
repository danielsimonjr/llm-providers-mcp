"""Unit tests for the gemini_mcp client config builder.

The bug these guard against: Gemini 2.5 Pro has dynamic thinking enabled
by default; thinking tokens count against `max_output_tokens`. With the
prior 4096-token default and no `thinking_config`, Pro silently returns
`response.text == ""` with `finish_reason=MAX_TOKENS`. The fix is to
expose `thinking_budget` (cap or disable thinking) and `temperature`
through the `_build_config` helper, called per-tool from server.py.

References:
- https://github.com/googleapis/python-genai/issues/811 (empty response with max_tokens)
- https://github.com/googleapis/python-genai/issues/782 (thinking models ignore budget)
- https://ai.google.dev/gemini-api/docs/thinking (cannot disable thinking on Pro)
"""

from __future__ import annotations

from servers.gemini_mcp.client import _build_config


class TestBuildConfig:
    def test_no_thinking_budget_means_no_thinking_config(self):
        config = _build_config(
            max_output_tokens=4096,
            thinking_budget=None,
            temperature=None,
            system_instruction=None,
        )
        assert config.thinking_config is None

    def test_thinking_budget_zero_disables_thinking(self):
        # Flash supports disabling thinking entirely with budget=0.
        config = _build_config(
            max_output_tokens=8192,
            thinking_budget=0,
            temperature=None,
            system_instruction=None,
        )
        assert config.thinking_config is not None
        assert config.thinking_config.thinking_budget == 0

    def test_thinking_budget_capped_for_pro(self):
        # Pro cannot disable thinking but can be capped (min 128, max 32768).
        # 8192 is the recommended Wave-Z setting for reasoning queries.
        config = _build_config(
            max_output_tokens=32768,
            thinking_budget=8192,
            temperature=0.2,
            system_instruction=None,
        )
        assert config.thinking_config.thinking_budget == 8192

    def test_temperature_passes_through(self):
        config = _build_config(
            max_output_tokens=4096,
            thinking_budget=None,
            temperature=0.2,
            system_instruction=None,
        )
        assert config.temperature == 0.2

    def test_max_output_tokens_passes_through(self):
        config = _build_config(
            max_output_tokens=32768,
            thinking_budget=None,
            temperature=None,
            system_instruction=None,
        )
        assert config.max_output_tokens == 32768

    def test_system_instruction_passes_through(self):
        config = _build_config(
            max_output_tokens=4096,
            thinking_budget=None,
            temperature=None,
            system_instruction="You are a careful reasoner.",
        )
        assert config.system_instruction == "You are a careful reasoner."
