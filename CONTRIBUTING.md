# Contributing

Thanks for your interest. This project follows the
[Contributor Covenant 2.1](CODE_OF_CONDUCT.md) — please read it first.

## Development setup

```bash
git clone https://github.com/danielsimonjr/llm-providers-mcp.git
cd llm-providers-mcp
uv venv --python 3.13
source .venv/Scripts/activate
uv pip install -e ".[openai,gemini,dev]"
```

## Running tests

```bash
pytest                       # unit tests only, no network
pytest -m integration        # integration tests (needs keys, costs money)
ruff check .
ruff format --check .
```

The CI runs `pytest -m "not integration"` and both ruff commands on Linux
and Windows across Python 3.10–3.13.

## Style

- `ruff` with the defaults in `pyproject.toml` — the CI will reject PRs that
  don't pass `ruff check .`.
- Four-space indent, double-quoted strings, trailing commas in multi-line
  collections.
- Type hints encouraged but not enforced. `from __future__ import annotations`
  at the top of every module so forward references work without cost.

## Adding a new provider server

See [`servers/README.md`](servers/README.md). The short version:

1. Create `servers/<provider>_mcp/` with `server.py` and any client helper.
2. Expose three tool categories mirroring the existing servers:
   `_quick_query`, `_reasoning_query`, and a third tool that plays to the
   provider's strength (agent loop, multimodal, function calling, etc.).
3. Use `shared.secrets.require_env` for the provider's key (fail fast at
   import, not at first tool call).
4. Use `shared.errors.classify` for exception handling.
5. Use `shared.formatting.ok` for success responses so the JSON shape stays
   uniform across providers.
6. Add a console-script entry in `pyproject.toml`.
7. Add an optional-extras group in `pyproject.toml` so the provider's SDK
   only installs when requested.
8. Update README and CHANGELOG.

## Security-sensitive PRs

Any PR that touches `shared/secrets.py`, `shared/errors.py`, or the key-loading
path in either server needs a second set of eyes on the four rules in
[`SECURITY.md`](SECURITY.md#key-handling-contract). Please call this out in
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
