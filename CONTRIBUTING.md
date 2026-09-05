# Contributing

Thanks for your interest. This project follows the
[Contributor Covenant 2.1](CODE_OF_CONDUCT.md) — please read it first.

## Development setup

Requires [Bun](https://bun.sh) >=1.4 and Node >=24 (smoke tests and Claude Code
plugins launch compiled servers with `node`).

```bash
git clone https://github.com/danielsimonjr/llm-providers-mcp.git
cd llm-providers-mcp
bun install
bun run build
```

## Running tests

```bash
bun test                 # unit + smoke (no network)
bun run typecheck
bun run build
```

CI runs `bun run typecheck`, `bun run build`, and `bun test` on Linux and
Windows with Bun 1.4.x. Smoke/`index-errors` spawn `node dist/<provider>/index.js`
so the production launcher stays covered.

## Style

- TypeScript strict mode (`tsc --noEmit` / `bun run typecheck`).
- Two-space indent, double-quoted strings, trailing commas in multi-line
  literals where the surrounding file already uses them.
- Prefer explicit types at module boundaries; lean on inference inside
  functions.

## Adding a new provider server

See [`docs/architecture.md`](docs/architecture.md). The short version:

1. Create `src/<provider>/` with an `index.ts` entry and any client helper
   (`tools.ts`, `client.ts` / `agents.ts`).
2. Expose three tool categories mirroring the existing servers:
   `_quick_query`, `_reasoning_query`, and a third tool that plays to the
   provider's strength (agent loop, multimodal, function calling, etc.).
3. Use `shared/secrets.requireEnv` for the provider's key (fail fast at
   startup, not at first tool call).
4. Use `shared/errors.classify` for exception handling.
5. Use `shared/formatting.ok` for success responses so the JSON shape stays
   uniform across providers.
6. Wire the entry through `shared/mcp-server.startStdioMcpServer`.
7. Add `bin` entries in `package.json` if you ship a new CLI name.
8. Update README and CHANGELOG; keep each `plugins/*/…/plugin.json` version
   equal to `package.json` (enforced by `tests/version-consistency.test.ts`).

## Security-sensitive PRs

Any PR that touches `src/shared/secrets.ts`, `src/shared/errors.ts`, or the
key-loading path in either server needs a second set of eyes on the four rules
in [`SECURITY.md`](SECURITY.md#key-handling-contract). Please call this out in
the PR description so reviewers know to look.

## Commit messages

Short imperative subject lines. "Why" in the body if non-obvious. Link to
issues where relevant. No strict conventional-commits requirement.

## PR process

1. Branch off `main`.
2. Open a PR early (draft is fine) so discussion can start before you're
   done coding.
3. Fill out the PR template checklist.
4. CI must pass before merge.
5. A maintainer will merge. Squash-merge is the default.
