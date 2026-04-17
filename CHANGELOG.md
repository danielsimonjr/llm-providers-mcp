# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Slash commands `/askGemini`, `/askGeminiPro`, `/askOpenAI`, and
  `/askOpenAIPro` in `.claude/commands/`. The base commands invoke the
  quick-model tools; the `*Pro` variants invoke the reasoning-model tools.
  Each command's response includes a model-name footer.

### Changed

- `servers/openai_mcp/agent.py::run_agent` now extracts token usage from
  `result.context_wrapper.usage` (the correct location in
  `openai-agents` 0.14.1) instead of looking for a top-level
  `result.usage`. Output now includes `input_tokens`, `output_tokens`,
  `total_tokens`, `requests`, and optionally `reasoning_tokens` /
  `cached_tokens` when the SDK reports them.
- GitHub Actions CI workflow activated at `.github/workflows/ci.yml`
  (moved from the staging location at `docs/ci.yml.example`). Runs on
  every push and PR to `main`.

## [0.1.0] - 2026-04-17

### Added

- Initial release.
- `servers/openai_mcp/` — MCP server wrapping the OpenAI Agents SDK
  (`openai-agents>=0.14`) with three tools: `openai_quick_query`,
  `openai_reasoning_query`, `openai_agent_run`.
- `servers/gemini_mcp/` — MCP server wrapping Google GenAI (`google-genai>=1.0`)
  with three tools: `gemini_quick_query`, `gemini_reasoning_query`,
  `gemini_multimodal_query`.
- `shared/` — cross-provider helpers for safe env-var loading
  (`secrets.py`), normalized error classification (`errors.py`), and
  uniform JSON response shape (`formatting.py`).
- `pyproject.toml` with optional extras `[openai]`, `[gemini]`, `[anthropic]`,
  `[dev]` so provider SDKs only install when requested.
- Phased build runbook (`LLM-Providers-MCP-Build-Runbook.md`) documenting
  every setup decision and the key-hygiene contract.
- MIT license.
- Contributor Covenant 2.1 code of conduct, CONTRIBUTING guide, SECURITY
  policy.
- GitHub Actions CI workflow prepared in `docs/ci.yml.example` but not
  activated in this release — activating it requires a `gh auth refresh
  -s workflow` token upgrade. Move to `.github/workflows/ci.yml` when
  ready.
- Issue and pull-request templates.

[Unreleased]: https://github.com/danielsimonjr/llm-providers-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/danielsimonjr/llm-providers-mcp/releases/tag/v0.1.0
