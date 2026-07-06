# Companion Skills for memory-mcp + llm-providers-mcp — Design

## Goal

Add companion guidance/playbook **skills** to two MCP plugins by consolidating
their existing slash **commands** into skills (the commands are kept, not
removed):

- **memory-mcp** → a `memory` skill (from the `MEMORY`, `EXPLORE`, `MIGRATE` commands).
- **llm-providers-mcp** → an `openai` skill (from `askOpenAI` + `askOpenAIPro`) and a `gemini` skill (from `askGemini` + `askGeminiPro`).

## Motivation

Both plugins ship companion **commands** but no companion **skills**. Skills
auto-trigger on natural-language intent and carry a judgment layer; commands are
explicit slash shortcuts. Adding skills mirrors the dropbox/windows/math/scieng
companions. Per decision, the commands stay — skills and commands coexist.

## Skills

### 1. `memory-mcp:memory` — `memory-mcp/skills/memory/`
Playbook over the sqlite-backed knowledge-graph server (~225 tools),
consolidating the three memory commands:
- **MEMORY** — graph CRUD, search, and maintenance.
- **EXPLORE** — index a project → update the knowledge graph + CLAUDE.md.
- **MIGRATE** — migrate storage between JSONL and SQLite.
The value is judgment: which tools/flow for a given memory task, plus the
EXPLORE and MIGRATE recipes. The 6 general-utility commands
(`CHUNK`/`CTON`/`COMMIT`/`DEPS`/`GRAPH`/`SEARCH`) are NOT part of this skill and
remain as commands (they are not memory operations).

### 2. `llm-openai:openai` — `llm-providers-mcp/plugins/llm-openai/skills/openai/`
Combines `askOpenAI` (`openai_quick_query`, gpt-4o-mini) + `askOpenAIPro`
(`openai_reasoning_query`, o3-mini). Guidance: quick vs. reasoning (use reasoning
for architecture questions, hard bugs, formal reasoning, step-by-step
decomposition — slower/costlier), how to invoke, report the answer with a model
footer from the response `model` field, surface `ok:false` errors (`kind` +
`message`) without speculating, prompt for the question if empty. Note the third
tool `openai_agent_run` also exists.

### 3. `llm-gemini:gemini` — `llm-providers-mcp/plugins/llm-gemini/skills/gemini/`
Combines `askGemini` (`gemini_quick_query`, 2.5-flash) + `askGeminiPro`
(`gemini_reasoning_query`, 2.5-pro). Same structure: quick vs. reasoning (use Pro
for multi-step reasoning, complex analysis, a careful second opinion), model
footer, `ok:false` handling, empty-question prompt. Note the third tool
`gemini_multimodal_query` also exists.

## Skill form (all three)

Guidance/playbook mirroring the existing companion skills: frontmatter (`name` +
trigger-rich `description`), when-to-use, the tool(s) and invocation, the
workflows the commands encode, and gotchas. **Verify tool names against the LIVE
server** — the commands reference `mcp__llm-openai__*` / `mcp__llm-gemini__*`,
but the plugin-loaded form is `mcp__plugin_llm-openai_llm-openai__*` /
`mcp__plugin_llm-gemini_llm-gemini__*` (confirm via `ToolSearch` and use the real
names). Each skill ships `SKILL.md` + `README.md`.

## Non-Goals

No new MCP tools, no server code changes, no command removal. Not a full
per-tool reference (the tools live in the servers). memory-mcp is not turned into
a grab-bag skill — only the 3 memory commands are consolidated.

## Placement & Load Model

- **memory-mcp** is flat/plugin-shaped → `skills/memory/` → loads `memory-mcp:memory`, `/memory`.
- **llm-providers-mcp** is git-subdir (each sub-plugin sourced individually into the marketplace) → `plugins/llm-openai/skills/openai/` (`llm-openai:openai`, `/openai`) and `plugins/llm-gemini/skills/gemini/` (`llm-gemini:gemini`, `/gemini`).
- Both repos are direct-push `main`.

## Release

- **memory-mcp**: `.claude-plugin/plugin.json` 12.5.2 → 12.6.0.
- **llm-openai**: `plugins/llm-openai/.claude-plugin/plugin.json` 2.0.0 → 2.1.0.
- **llm-gemini**: `plugins/llm-gemini/.claude-plugin/plugin.json` 2.0.0 → 2.1.0.
- Update each repo README + CHANGELOG (if present). Atomic commit(s), push to `main`. Deliver via `/plugin marketplace update` + `/reload-plugins`.

## Success Criteria

1. Three `SKILL.md` + three `README.md` exist with frontmatter names `memory` / `openai` / `gemini`.
2. Every tool name referenced in a skill matches the live server (verified via `ToolSearch`, not assumed).
3. Versions bumped as above; original commands untouched; committed and pushed.
4. After marketplace update + reload, the skills load as `memory-mcp:memory`, `llm-openai:openai`, `llm-gemini:gemini` and their slash triggers work.

## Testing

Documentation artifacts — verification, not unit tests: frontmatter parses and
the skills appear after reload; tool-name accuracy cross-checked against
`ToolSearch`; every claim grounded (honest-claude); load verification after
release.
