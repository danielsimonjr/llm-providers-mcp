# Security Policy

## Reporting a vulnerability

Please use GitHub's **Private Vulnerability Reporting** (the "Report a
vulnerability" button under the Security tab) to file an advisory. Do not
open a public issue for anything that would disclose keys, user data, or an
exploitable code path.

You should expect an initial response within 72 hours.

## What's in scope

| In scope | Out of scope |
|---|---|
| Accidental secret leakage in code paths (logs, error messages, config writes) | Bugs in the provider SDKs themselves (`openai`, `openai-agents`, `google-genai`) |
| Prompt injection from tool results that causes the server to leak or act on keys | User-side misconfiguration (wrong file permissions, keys in Dropbox, etc.) |
| Supply-chain concerns about our own code or pinned deps | Denial of service against third-party APIs |
| Logic bugs in `shared/errors.py` classification that could mask an auth failure | Rate-limit behavior of the underlying providers |

## Key handling contract

This repo holds itself to these rules — anything that violates them is a
security bug:

1. API keys must be read **only** from environment variables (`os.environ`).
2. Keys must **never** appear in source files, `.env` files committed to git,
   config files checked in, commit messages, log output, exception traces
   rendered to the user, or MCP tool response payloads.
3. `shared/secrets.redact()` must be used for any diagnostic that mentions a
   key's shape (length, prefix).
4. `shared/errors.classify()` must not echo the underlying exception message
   verbatim into tool responses without first reviewing for possible key
   leakage from SDK internals.

Code review for any PR should check that these four rules hold.

## Supported versions

Only `main` receives security updates at this time. If you're pinning to a
tagged release, upgrade before reporting issues.
