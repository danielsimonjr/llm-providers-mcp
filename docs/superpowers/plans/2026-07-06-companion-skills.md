# Companion Skills (commands → skills) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three guidance/playbook skills — `memory-mcp:memory`, `llm-openai:openai`, `llm-gemini:gemini` — consolidating existing slash commands into skills, with the commands kept.

**Architecture:** Markdown skill files (`SKILL.md` + `README.md`) added to two plugin repos, plus per-repo version bumps + README/CHANGELOG updates. memory-mcp is flat (`skills/memory/`); llm-providers-mcp is git-subdir, so its skills live under each sub-plugin (`plugins/llm-openai/skills/openai/`, `plugins/llm-gemini/skills/gemini/`).

**Tech Stack:** Markdown + YAML frontmatter. Reference style: `C:\Users\danie\Github\math-mcp\skills\math\SKILL.md` and `C:\Users\danie\Github\dropbox-mcp\skills\dropbox\SKILL.md`.

## Global Constraints

- Skill frontmatter `name:` is EXACTLY `memory`, `openai`, `gemini` respectively (→ loads as `memory-mcp:memory`, `llm-openai:openai`, `llm-gemini:gemini`; slashes `/memory`, `/openai`, `/gemini`).
- Guidance/playbook form only — no new tools, no server code changes, **no command deletion** (all existing commands stay).
- **Tool names MUST be verified against the LIVE server via `ToolSearch` and use the plugin-prefixed form** — `mcp__plugin_<plugin>_<serverkey>__<tool>`. Do NOT copy the commands' legacy names (`mcp__memory-mcp__*`, `mcp__memory__*`, `mcp__llm-openai__*`, `mcp__llm-gemini__*`) — those are stale.
- The `memory` skill consolidates ONLY the 3 memory commands (`MEMORY`, `EXPLORE`, `MIGRATE`); the 6 general-utility commands (`CHUNK`/`CTON`/`COMMIT`/`DEPS`/`GRAPH`/`SEARCH`) are out of scope and untouched.
- No version numbers or dates in skill bodies.
- Each skill ships `SKILL.md` + `README.md`.
- Releases: memory-mcp `.claude-plugin/plugin.json` 12.5.2 → 12.6.0; `plugins/llm-openai/.claude-plugin/plugin.json` 2.0.0 → 2.1.0; `plugins/llm-gemini/.claude-plugin/plugin.json` 2.0.0 → 2.1.0.
- Both repos are direct-push `main`. Files LF (repo default).

---

### Task 1: `memory` skill (memory-mcp)

**Files:**
- Create: `C:\Users\danie\Github\memory-mcp\skills\memory\SKILL.md`
- Create: `C:\Users\danie\Github\memory-mcp\skills\memory\README.md`
- Read (for content, do not modify): `C:\Users\danie\Github\memory-mcp\.claude\commands\{MEMORY,EXPLORE,MIGRATE}.md`
- Reference (style): `C:\Users\danie\Github\math-mcp\skills\math\SKILL.md`

- [ ] **Step 1: Verify the live memory-mcp tool names**

Run `ToolSearch` query `+memory-mcp` (max_results 80). Confirm the plugin-prefixed form `mcp__plugin_memory-mcp_memory-mcp__<tool>`. Note the real names for the operations the MEMORY command lists: `search_nodes`, `get_graph_stats`, `open_nodes`, `read_graph`, `find_duplicates`, `create_entities`, `add_observations`, `delete_observations`, `delete_entities`, `create_relations`, `add_tags`, `set_importance`, `merge_entities`, `compress_graph`. Use ONLY names that actually exist on the live server.

- [ ] **Step 2: Write `SKILL.md` frontmatter (verbatim)**

```yaml
---
name: memory
description: "Playbook for the memory-mcp knowledge-graph server (sqlite-backed cross-session memory). Use when the user says 'remember this', 'save/store to memory', 'search my memory/knowledge graph', 'what do I know about X', 'record this decision', 'update the graph', 'index this project into memory', 'run memory maintenance / dedup / compress', or 'migrate memory storage'. Consolidates the MEMORY (graph CRUD/search/maintenance), EXPLORE (index a project into the graph + CLAUDE.md), and MIGRATE (JSONL<->SQLite storage) workflows over the memory-mcp tools. Does NOT cover the repo's general dev-utility commands (chunk/cton/commit/deps/graph/search)."
---
```

- [ ] **Step 3: Write the body** (mirror the math/dropbox skill voice)

Sections:
1. **Intro + skill root** — the judgment layer over the memory-mcp knowledge-graph server; ships in the `memory-mcp` plugin (`skills/memory/`), slash `/memory`.
2. **When to use / not** — use for knowledge-graph memory (store, recall, search, maintain, index a project, migrate storage); NOT for the general utilities (chunk/cton/commit/deps/graph/search — those remain separate commands).
3. **Core memory operations (from MEMORY)** — a table mapping intent → tool, using the VERIFIED live tool names: read (stats→`get_graph_stats`, search→`search_nodes`, open→`open_nodes`, read-all→`read_graph` (sparingly), duplicates→`find_duplicates`); write (add observation→`add_observations`, create entity→`create_entities`, relate→`create_relations`, tag→`add_tags`, importance→`set_importance`, delete→`delete_entities`/`delete_observations`); maintenance (compress→`compress_graph`, merge→`merge_entities`). Include the session workflow: session-start `get_graph_stats`; during-work `add_observations`; session-end persist a summary observation; periodic maintenance. Include the tips (search before creating; importance 0-10; tag for filtering; keep observations concise).
4. **Index a project (from EXPLORE)** — the recipe: gather project metadata (package.json, git log/status, source/test file counts, recent diffs) → create/update entities + observations in the graph for the project and key components → optionally update CLAUDE.md. Note it's a compose of Bash/Read/Glob/Grep + the memory tools.
5. **Migrate storage (from MIGRATE)** — the `migrate-from-jsonl-to-sqlite` tool converts between JSONL (`.jsonl`/`.json`) and SQLite (`.db`/`.sqlite`/`.sqlite3`), auto-detecting by extension, with a verification step (`--from`/`--to`/`--verbose`). **Do NOT hardcode the `C:\mcp-servers\...` path from the command** — state that the migration tool ships with memory-mcp under its `tools/migrate-from-jsonl-to-sqlite/` and to locate it relative to the install; note it's an occasional maintenance op.
6. **Gotchas** — `read_graph` can be huge (use `search_nodes`/`open_nodes` instead); dedup before bulk-creating; the server has a large tool surface (~225 tools) so prefer the operations above for everyday use and `ToolSearch` for anything else.

- [ ] **Step 4: Write `README.md`** — short overview (~20-40 lines): what the skill is (playbook over the memory-mcp server), load id `memory-mcp:memory` + slash `/memory`, one-line list of the three workflows (graph CRUD/search/maintenance, project indexing, storage migration), pointer to SKILL.md. No version/date. No duplication of the SKILL body.

- [ ] **Step 5: Self-review + honest-claude**

Read both files. Confirm: frontmatter `name: memory`; all sections present; no placeholders; no version/date in bodies. Invoke `honest-claude`: every tool name in the skill must be one that appeared in the Step-1 `ToolSearch` output — fix or drop any that didn't. Confirm the `C:\mcp-servers` hardcoded path was NOT copied.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/danie/Github/memory-mcp"
git add skills/memory/SKILL.md skills/memory/README.md
git commit -m "feat(skill): add memory-mcp:memory playbook (MEMORY/EXPLORE/MIGRATE)"
```

---

### Task 2: `openai` + `gemini` skills (llm-providers-mcp)

**Files:**
- Create: `C:\Users\danie\Github\llm-providers-mcp\plugins\llm-openai\skills\openai\SKILL.md` + `README.md`
- Create: `C:\Users\danie\Github\llm-providers-mcp\plugins\llm-gemini\skills\gemini\SKILL.md` + `README.md`
- Read (content): `C:\Users\danie\Github\llm-providers-mcp\.claude\commands\{askOpenAI,askOpenAIPro,askGemini,askGeminiPro}.md`
- Reference (style): `C:\Users\danie\Github\math-mcp\skills\math\SKILL.md`

- [ ] **Step 1: Verify the live tool names**

`ToolSearch` `+llm-openai` and `+llm-gemini`. Confirm: `mcp__plugin_llm-openai_llm-openai__{openai_quick_query,openai_reasoning_query,openai_agent_run}` and `mcp__plugin_llm-gemini_llm-gemini__{gemini_quick_query,gemini_reasoning_query,gemini_multimodal_query}`. Use these exact names.

- [ ] **Step 2: Write `openai/SKILL.md`**

Frontmatter (verbatim):
```yaml
---
name: openai
description: "Ask OpenAI via the llm-openai MCP server (codename Eve). Use when the user says 'ask OpenAI', 'ask GPT', 'ask o3 / the reasoning model', 'get a second opinion from OpenAI', or wants OpenAI to answer/analyze something. Covers the quick model (gpt-4o-mini via openai_quick_query) for everyday questions and the reasoning model (o3-mini via openai_reasoning_query) for architecture, hard bugs, formal reasoning, and step-by-step decomposition. Not for image input."
---
```
Body: (1) intro + skill root (ships in `llm-openai` sub-plugin, `plugins/llm-openai/skills/openai/`, `/openai`); (2) **which tool** — `openai_quick_query` (gpt-4o-mini, default, fast/cheap) vs `openai_reasoning_query` (o3-mini, slower/costlier — architecture questions, hard bugs, formal reasoning, step-by-step decomposition); mention `openai_agent_run` exists for agentic/tool-using runs; (3) **how to answer** — report OpenAI's answer verbatim; append a single-line footer with the `model` field from the response (e.g. `— gpt-4o-mini` / `— o3-mini`); on `ok:false`, show the error `kind` + `message` without speculating; if no question was given, ask what to send first; (4) gotcha: the tools are text-only (no image input).

- [ ] **Step 3: Write `openai/README.md`** — short overview: load id `llm-openai:openai`, `/openai`; quick vs reasoning in one line; pointer to SKILL.md. No version/date.

- [ ] **Step 4: Write `gemini/SKILL.md`**

Frontmatter (verbatim):
```yaml
---
name: gemini
description: "Ask Google Gemini via the llm-gemini MCP server (codename Adam). Use when the user says 'ask Gemini', 'ask Gemini Pro', 'get a second opinion from Gemini', or wants Gemini to answer/analyze something. Covers the quick model (gemini-2.5-flash via gemini_quick_query) for everyday questions and Gemini 2.5 Pro (gemini_reasoning_query) for multi-step reasoning, complex analysis, and careful second opinions. A gemini_multimodal_query tool also handles image/multimodal input."
---
```
Body: same structure as openai — (1) intro + skill root (`plugins/llm-gemini/skills/gemini/`, `/gemini`); (2) which tool — `gemini_quick_query` (2.5-flash, default) vs `gemini_reasoning_query` (2.5-pro — multi-step reasoning, complex analysis, careful second opinion); mention `gemini_multimodal_query` for image/multimodal; (3) how to answer — verbatim + `model`-field footer (e.g. `— gemini-2.5-flash` / `— gemini-2.5-pro`); `ok:false` → `kind`+`message`, no speculation; prompt if empty; (4) gotcha: use `gemini_multimodal_query` (not the text tools) for images.

- [ ] **Step 5: Write `gemini/README.md`** — short overview: load id `llm-gemini:gemini`, `/gemini`; quick vs Pro + multimodal in one line; pointer to SKILL.md. No version/date.

- [ ] **Step 6: Self-review + honest-claude**

Confirm both frontmatter names (`openai`, `gemini`); tool names match Step-1 `ToolSearch` output exactly; no placeholders; no version/date. Invoke `honest-claude` on the model/tool claims.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/danie/Github/llm-providers-mcp"
git add plugins/llm-openai/skills plugins/llm-gemini/skills
git commit -m "feat(skill): add llm-openai:openai and llm-gemini:gemini playbooks"
```

---

### Task 3: Release memory-mcp (12.6.0)

**Files:**
- Modify: `C:\Users\danie\Github\memory-mcp\.claude-plugin\plugin.json` (12.5.2 → 12.6.0)
- Modify: `C:\Users\danie\Github\memory-mcp\README.md`
- Modify: `C:\Users\danie\Github\memory-mcp\CHANGELOG.md`

- [ ] **Step 1: Bump `plugin.json`** version `12.5.2` → `12.6.0` (leave name/description).
- [ ] **Step 2: README** — add a short "## Companion skill" note: the plugin now ships a `memory` skill (`memory-mcp:memory`, `/memory`) — a playbook over the knowledge-graph tools (graph CRUD/search/maintenance, project indexing, storage migration); see `skills/memory/SKILL.md`. No version/date in the note body. (Do not touch the `package.json`/npm version — this is a plugin-manifest release; if the README shows a version badge, leave it.)
- [ ] **Step 3: CHANGELOG** — add an entry (follow the file's existing Keep-a-Changelog style; if there is an `## [Unreleased]`, add under it, else add a dated `## [12.6.0]` section at the top): "Added: companion `memory` skill (`memory-mcp:memory`, `/memory`) consolidating the MEMORY/EXPLORE/MIGRATE commands into a playbook; commands unchanged. No server/tool changes."
- [ ] **Step 4: Verify + commit + push**

```bash
cd "C:/Users/danie/Github/memory-mcp"
grep -n '"version"' .claude-plugin/plugin.json     # expect 12.6.0
git add .claude-plugin/plugin.json README.md CHANGELOG.md
git commit -m "release: memory-mcp 12.6.0 — ship the memory companion skill"
git push origin main
git ls-remote origin -h refs/heads/main            # confirm == local HEAD
git rev-parse HEAD
```

---

### Task 4: Release llm-providers-mcp (llm-openai 2.1.0, llm-gemini 2.1.0)

**Files:**
- Modify: `C:\Users\danie\Github\llm-providers-mcp\plugins\llm-openai\.claude-plugin\plugin.json` (2.0.0 → 2.1.0)
- Modify: `C:\Users\danie\Github\llm-providers-mcp\plugins\llm-gemini\.claude-plugin\plugin.json` (2.0.0 → 2.1.0)
- Modify: `C:\Users\danie\Github\llm-providers-mcp\README.md`
- Modify: `C:\Users\danie\Github\llm-providers-mcp\CHANGELOG.md`

- [ ] **Step 1: Bump both sub-plugin manifests** to `2.1.0` (version field only).
- [ ] **Step 2: README** — add a short note that the `llm-openai` plugin now ships an `openai` skill (`llm-openai:openai`, `/openai`) and `llm-gemini` ships a `gemini` skill (`llm-gemini:gemini`, `/gemini`) — playbooks over the quick/reasoning query tools; see the respective `plugins/*/skills/*/SKILL.md`. No version/date in the note.
- [ ] **Step 3: CHANGELOG** — add an entry: "Added: companion `openai` (llm-openai:openai, /openai) and `gemini` (llm-gemini:gemini, /gemini) skills consolidating the askOpenAI/askOpenAIPro and askGemini/askGeminiPro commands; commands unchanged. Both sub-plugins bumped to 2.1.0."
- [ ] **Step 4: Verify + commit + push**

```bash
cd "C:/Users/danie/Github/llm-providers-mcp"
grep -n '"version"' plugins/llm-openai/.claude-plugin/plugin.json plugins/llm-gemini/.claude-plugin/plugin.json   # expect 2.1.0 x2
git add plugins/llm-openai/.claude-plugin/plugin.json plugins/llm-gemini/.claude-plugin/plugin.json README.md CHANGELOG.md
git commit -m "release: llm-openai + llm-gemini 2.1.0 — ship openai/gemini companion skills"
git push origin main
git ls-remote origin -h refs/heads/main            # confirm == local HEAD
git rev-parse HEAD
```

---

## Delivery (post-plan, user step — not a task)

`/plugin marketplace update local-marketplace` + `/reload-plugins`. Confirm `memory-mcp:memory`, `llm-openai:openai`, `llm-gemini:gemini` load. Check `/mcp` (fresh clones can be incomplete on this machine).

## Self-Review (plan vs. spec)

- **Coverage:** memory skill → Task 1; openai + gemini skills → Task 2; memory-mcp release → Task 3; llm-providers release → Task 4. All spec success criteria mapped (load verification = Delivery). Tool-name verification is Step 1 of Tasks 1 & 2. Commands kept (no deletion step anywhere). memory scope limited to 3 commands (stated in Task 1 + Global Constraints).
- **Placeholders:** none — frontmatter verbatim, tool lists explicit, section content specified.
- **Consistency:** names `memory`/`openai`/`gemini` and load ids identical throughout; versions (12.6.0; 2.1.0 x2) consistent between Global Constraints and Tasks 3-4.
