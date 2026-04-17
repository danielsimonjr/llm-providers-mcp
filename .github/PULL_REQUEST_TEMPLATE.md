<!-- One-line summary of the change for the PR title above, then a longer
     explanation here if the change isn't trivial. -->

## What changed

-
-

## Why

<!-- What problem does this solve? Link to the issue if there is one. -->

Closes #

## How I tested

- [ ] `pytest -m "not integration"` passes locally
- [ ] `ruff check .` passes
- [ ] `ruff format --check .` passes
- [ ] (If the change touches a server) Verified via MCP Inspector: `npx @modelcontextprotocol/inspector ./.venv/Scripts/python.exe -m servers.<name>.server`
- [ ] (If the change touches `shared/secrets.py`, `shared/errors.py`, or any key-loading path) Re-read SECURITY.md's four-rule contract and confirmed this PR doesn't violate any

## Breaking changes

<!-- If yes, describe migration path. Bump the version in pyproject.toml
     accordingly and note it in CHANGELOG.md. -->

## Notes for reviewers

<!-- Anything non-obvious. Decisions you made and might want to revisit. -->
