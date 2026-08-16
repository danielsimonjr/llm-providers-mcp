# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed (2026-08-16)

- **Both servers reported themselves as `2.0.0` while shipping as `2.1.1`.** The version lived
  in **four** places — `package.json`, each plugin's `plugin.json`, and a string literal in each
  entry point — with nothing comparing them. The manifests moved to 2.1.1 and everything else
  stayed behind. `serverInfo.version` is the field used to prove a deploy landed, so while it
  disagreed with the manifest a stale deploy and a healthy one were indistinguishable.
  `package.json` is now the single source (bumped to **2.1.1**) and the version is injected at
  build time via `src/shared/version.ts`. One shared module, not one declaration per entry,
  because two entries writing the same constant is the shape that caused the drift.
- **`tests/version-consistency.test.ts` pins it.** Asserts each `plugin.json` equals
  `package.json` and that neither entry contains a hardcoded semver in its `Server()`
  constructor. Mutation-proven: drifting one manifest to 2.1.0 failed the gate by name;
  restoring returned 5 passed.

### Added (2026-08-16)

- **`scripts/bundle.mjs` — the shipped artifacts are reproducible again.** Both
  `plugins/*/bundle/index.mjs` were committed with **no build script and no bundler
  dependency**, so a source fix could land while the plugins kept serving whatever was
  committed, and no gate would notice because the tests run against `src/`. Rebuilding was a
  prerequisite for fixing the version at all. Flags recovered from the shipped artifacts rather
  than guessed: the `__commonJS`/`__toESM` helpers name esbuild, the line-2 `createRequire`
  banner names the format and shim, the line-1 shebang names each entry as a bin. The banner
  deliberately emits **no** shebang — both entries already have one, and a second is a syntax
  error on line 2.
  - Verified by **executing** both rebuilt bundles over MCP stdio: `gemini-mcp 2.1.1` and
    `openai-mcp 2.1.1`, three tools each. 67 tests pass.

### Security (2026-08-04)

Lock-only via `npm update`; no manifest changed. Transitive dependencies of the
MCP SDK / server stack:

- `ip-address` -> 10.4.0 (1 high + 2 medium; needed 10.3.1)
- `hono` -> 4.13.0 (medium; needed 4.12.34)
- `fast-uri` -> 3.1.5 (high; needed 3.1.5)

Only the packages present in this repo's tree are listed above by the resolver;
`npm audit` reports 0 vulnerabilities. Verified with `npm ci` plus this repo's
own build and test scripts.


### Security (2026-08-03)

- `@hono/node-server` 1.19.x -> 2.0.12 (medium, needs 2.0.5), via
  `@modelcontextprotocol/sdk` 1.29.0 -> 1.30.0.

The hono fix required an indirection: the MCP SDK pinned `@hono/node-server`
to `^1.19.9`, so no in-range update could reach 2.x. SDK 1.30.0 widened that
to `^1.19.9 || ^2.0.5` and is itself inside the existing SDK range, so the
fix is lock-only — no manifest change.


### Added
- Companion `openai` (`llm-openai:openai`, `/openai`) and `gemini`
  (`llm-gemini:gemini`, `/gemini`) skills consolidating the
  askOpenAI/askOpenAIPro and askGemini/askGeminiPro commands; commands
  unchanged. Both sub-plugins bumped to 2.1.0.
- **Fast-follow:** the `openai` and `gemini` skills now reference the
  plugin-prefixed tool names (`mcp__plugin_llm-openai_llm-openai__*`,
  `mcp__plugin_llm-gemini_llm-gemini__*`) plus a `ToolSearch` bootstrap
  line for fetching schemas when a tool isn't loaded, and drop the old
  askOpenAI/askOpenAIPro and askGemini/askGeminiPro command-name routing
  hints in favor of naming the routing condition directly. Both
  sub-plugins bumped to 2.1.1.
- **OpenAI reasoning fallback (o3 → o4-mini).** `openai_reasoning_query` and
  `openai_agent_run` now retry once on a cheaper, higher-rate-limit fallback model
  when the primary reasoning model returns a 429 (rate-limit OR insufficient-quota).
  The fallback model is `OPENAI_REASONING_FALLBACK_MODEL` (default `o4-mini`); the
  response's `usage.fallback_from` records the primary model when a fallback was
  used. Keeps reasoning available when o3 is throttled or tier-gated; a
  fully-exhausted account credit pool still surfaces `insufficient_quota` from both.
- New `insufficient_quota` `ErrorKind`, classified BEFORE `rate_limit` (OpenAI's
  quota 429 also contains "429"). It is a billing condition — not a transient
  throttle — so it is labelled distinctly (retries/backoff can't clear it).

## [2.0.0] - 2026-05-30

### Changed
- **Rewrote both MCP servers (llm-gemini, llm-openai) from Python to TypeScript.**
  Runtime is now Node >=24 via `dist/gemini/index.js` and `dist/openai/index.js`;
  no Python venv or editable install required. Tool names, input schemas, system
  prompts/instructions, model defaults, token/thinking budgets, the
  `OPENAI_REASONING_MODEL` override, and the `{ok,...,data}` / `{ok:false,error}`
  response shapes are preserved.
- SDKs: `@google/genai` (Gemini) and `@openai/agents` (OpenAI), replacing the
  Python `google-genai` and `openai-agents`.
- MCP wiring uses the low-level `@modelcontextprotocol/sdk` `Server` with a
  `TOOLS`/`HANDLERS` pattern (matching the sibling gmail-mcp / time-mcp repos).

### Known limitations
- `openai_*` tool responses currently return an empty `usage` object:
  `@openai/agents@0.1.11` does not expose token usage at the probed
  `result.state.context.usage` path. Responses are otherwise correct; usage is
  best-effort metadata. Gemini usage is unaffected. (Tracked for a follow-up.)

### Removed
- Python implementation (`servers/`, `shared/`, `pyproject.toml`, `uv.lock`).

## [Pre-2.0.0 — Python era] - 2026-05-07

> These entries predate the 2.0.0 TypeScript rewrite (2026-05-30), which
> removed the Python implementation they describe. Preserved here for history.

### Added

- Slash commands `/askGemini`, `/askGeminiPro`, `/askOpenAI`, and
  `/askOpenAIPro` in `.claude/commands/`. The base commands invoke the
  quick-model tools; the `*Pro` variants invoke the reasoning-model tools.
  Each command's response includes a model-name footer.
- `servers/gemini_mcp/client.py::_build_config` — extracted helper that
  constructs `GenerateContentConfig` with `thinking_config` and
  `temperature` set. Unit-tested via `tests/test_gemini_client.py`
  (6 tests, no network).
- `generate()` now also surfaces `thoughts_tokens` and `finish_reason`
  in the usage dict for debugging silent-truncation cases.

### Fixed

- **Gemini empty-response / silent-truncation bug.** With no
  `thinking_config` set and `max_output_tokens=4096`, Gemini 2.5 Pro
  silently returned `response.text == ""` because dynamic thinking
  consumed the entire output budget (finish_reason=MAX_TOKENS). Per
  the official [Gemini thinking docs](https://ai.google.dev/gemini-api/docs/thinking),
  Pro cannot disable thinking but accepts a budget cap; Flash supports
  `thinking_budget=0` to disable entirely. `gemini_quick_query` (Flash)
  now sets `thinking_budget=0, max_output_tokens=8192`;
  `gemini_reasoning_query` (Pro) sets `thinking_budget=8192,
  max_output_tokens=32768`. Both also set `temperature=0.2` for
  deterministic technical reasoning. References:
  [googleapis/python-genai#811](https://github.com/googleapis/python-genai/issues/811),
  [googleapis/python-genai#782](https://github.com/googleapis/python-genai/issues/782).

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

[Unreleased]: https://github.com/danielsimonjr/llm-providers-mcp/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/danielsimonjr/llm-providers-mcp/compare/v0.1.0...v2.0.0
[0.1.0]: https://github.com/danielsimonjr/llm-providers-mcp/releases/tag/v0.1.0
