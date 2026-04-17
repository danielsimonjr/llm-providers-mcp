# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- GitHub Actions CI running `ruff` and `pytest` unit tests on Linux and
  Windows across Python 3.10–3.13.
- Issue and pull-request templates.

[Unreleased]: https://github.com/danielsimonjr/llm-providers-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/danielsimonjr/llm-providers-mcp/releases/tag/v0.1.0
