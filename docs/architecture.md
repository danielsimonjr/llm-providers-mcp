# Architecture

This project wraps third-party LLM SDKs as MCP servers. Claude Code calls our
tools; our tools call the provider SDKs; the SDKs call the providers. Each
MCP server is a separate stdio subprocess so a crash in one provider can't
take down the others.

## Layers

```
┌─────────────────────────────────────────────┐
│ Claude Code (orchestrator)                  │
└───────────────────┬─────────────────────────┘
                    │ stdio MCP
       ┌────────────┼────────────┐
       │            │            │
       ▼            ▼            ▼
  ┌─────────┐  ┌─────────┐  ┌─────────┐
  │ openai  │  │ gemini  │  │ (future)│
  │  _mcp   │  │  _mcp   │  │         │
  └────┬────┘  └────┬────┘  └────┬────┘
       │            │            │
       ▼            ▼            ▼
  openai-agents  google-genai   <sdk>
  (OpenAI API)   (Gemini API)
```

Everything above the `shared/` module is provider-specific. Everything at or
below `shared/` is provider-agnostic.

## Module layout

| Path | Responsibility |
|---|---|
| `servers/<provider>_mcp/server.py` | FastMCP decorator surface: tool registration, catching/classifying exceptions, shaping the response envelope. Nothing SDK-specific beyond imports. |
| `servers/<provider>_mcp/<client or agent>.py` | The provider SDK's actual usage — how to build a client, how to call the API, how to extract usage metadata. |
| `shared/secrets.py` | `require_env`, `env_or`, `redact`. Every key load goes through here. |
| `shared/errors.py` | `ProviderError` dataclass + `classify()` heuristic. Mapped to a normalized `{ok: false, error: {...}}` response via `ProviderError.to_tool_response()`. |
| `shared/formatting.py` | `ok()` factory for success responses. Shape: `{ok: true, provider, model, usage, data}`. |

## Response envelope

Every tool returns a dict in one of two shapes.

**Success**:
```json
{
  "ok": true,
  "provider": "openai",
  "model": "gpt-4o-mini",
  "usage": {"input_tokens": 12, "output_tokens": 3, "total_tokens": 15},
  "data": "pong"
}
```

**Error**:
```json
{
  "ok": false,
  "error": {
    "provider": "gemini",
    "kind": "rate_limit",
    "message": "...",
    "retry_after_seconds": null
  }
}
```

Error `kind` is one of: `rate_limit`, `auth`, `timeout`, `invalid_request`,
`unknown`. The upstream orchestrator (Claude Code) can branch on this without
parsing free-text error messages.

## Why a two-file split per server

`server.py` holds the MCP surface. `agent.py` / `client.py` holds the SDK
usage. This boundary:

1. Lets us unit-test the SDK usage without standing up an MCP server.
2. Lets us swap the MCP framework (FastMCP → something else) without
   touching SDK code.
3. Keeps `server.py` small enough to audit at a glance for key-leak risks.

## Failure modes and where they're caught

| Failure | Where it's caught | How it surfaces |
|---|---|---|
| Missing API key | `require_env()` at import time (in `server.py`) | `MissingCredentialError` → process crashes immediately with clear message |
| SDK raises rate-limit error mid-call | `except Exception` in the tool function | `{ok: false, error: {kind: "rate_limit", ...}}` |
| Network timeout | Same | `{ok: false, error: {kind: "timeout", ...}}` |
| SDK raises something we haven't seen | Same | `{ok: false, error: {kind: "unknown", message: "..."}}` — so the raw message surfaces, but not the key |
| Provider returns empty response | Tool returns `data: ""` with valid `ok: true` | Upstream decides how to handle empty |

## Security invariants

See [SECURITY.md](../SECURITY.md#key-handling-contract) for the four key-handling
rules this architecture is built around. The module layout above is chosen
specifically to make those rules easy to audit:

- Only `shared/secrets.py` reads `os.environ`.
- Only `shared/errors.classify` builds the error string that reaches the
  user.
- Every `@mcp.tool()` ends with either `ok(...)` or `.to_tool_response()` —
  grep for those to enumerate every place a response leaves our process.
