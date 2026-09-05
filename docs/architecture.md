# Architecture

This project wraps third-party LLM SDKs as MCP servers. Claude Code calls our
tools; our tools call the provider SDKs; the SDKs call the providers. Each
MCP server is a separate stdio subprocess so a crash in one provider can't
take down the others.

**Language / toolchain:** TypeScript, developed and tested on Bun.
**Shipped process:** Node runs the compiled `dist/` (and plugin `bundle/`)
entrypoints that Claude Code launches.

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
  │  MCP    │  │  MCP    │  │         │
  └────┬────┘  └────┬────┘  └────┬────┘
       │            │            │
       ▼            ▼            ▼
  @openai/agents  @google/genai   <sdk>
  (OpenAI API)    (Gemini API)
```

Everything above the `shared/` module is provider-specific. Everything at or
below `shared/` is provider-agnostic.

## Module layout

| Path | Responsibility |
|---|---|
| `src/<provider>/index.ts` | Stdio entry: heartbeat, `requireEnv`, `startStdioMcpServer`. |
| `src/<provider>/tools.ts` | Tool defs + handlers: catch/classify exceptions, shape the response envelope. |
| `src/<provider>/client.ts` or `agents.ts` | Provider SDK usage — client/agent construction, API calls, usage metadata. |
| `src/shared/mcp-server.ts` | Shared MCP v2 `serveStdio` wiring (legacy + 2026-07-28). |
| `src/shared/secrets.ts` | `requireEnv`, `envOr`, `redact`. Every key load goes through here. |
| `src/shared/errors.ts` | `ProviderError` + `classify()` heuristic → `{ok: false, error: {...}}`. |
| `src/shared/formatting.ts` | `ok()` factory. Shape: `{ok: true, provider, model, usage, data}`. |
| `src/shared/version.ts` | Single injected version from `package.json` at bundle time. |
| `plugins/*/bundle/index.mjs` | Reproducible esbuild bundles for Claude Code plugins (`bun run bundle`). |

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

Error `kind` is one of: `rate_limit`, `insufficient_quota`, `auth`, `timeout`,
`invalid_request`, `unknown`. The upstream orchestrator (Claude Code) can branch
on this without parsing free-text error messages.

## Why a two-file split per server

`index.ts` / `tools.ts` hold the MCP surface. `agents.ts` / `client.ts` hold
the SDK usage. This boundary:

1. Lets us unit-test the SDK usage without standing up an MCP server.
2. Lets us swap the MCP wiring without touching SDK code.
3. Keeps the entry small enough to audit at a glance for key-leak risks.

## Failure modes and where they're caught

| Failure | Where it's caught | How it surfaces |
|---|---|---|
| Missing API key | `requireEnv()` at startup (in `index.ts`) | `MissingCredentialError` → process exits immediately with a clear message |
| SDK raises rate-limit error mid-call | `try/catch` in the tool handler | `{ok: false, error: {kind: "rate_limit", ...}}` |
| Network timeout | Same | `{ok: false, error: {kind: "timeout", ...}}` |
| SDK raises something we haven't seen | Same | `{ok: false, error: {kind: "unknown", message: "..."}}` — raw message surfaces, but not the key |
| Provider returns empty response | Tool returns `data: ""` with valid `ok: true` | Upstream decides how to handle empty |

## Security invariants

See [SECURITY.md](../SECURITY.md#key-handling-contract) for the four key-handling
rules this architecture is built around. The module layout above is chosen
specifically to make those rules easy to audit:

- Only `src/shared/secrets.ts` reads environment credentials.
- Only `shared/errors.classify` builds the error string that reaches the user.
- Every tools/call handler ends with either `ok(...)` or `.toToolResponse()` —
  grep for those to enumerate every place a response leaves our process.
