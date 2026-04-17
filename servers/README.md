# Adding a new provider

Each subdirectory of `servers/` is one MCP server wrapping one LLM provider.
The pattern has stayed identical across OpenAI and Gemini; follow it for the
next one.

## Decision tree

**Is the new provider OpenAI-compatible** (speaks `/v1/chat/completions`)?

- Yes → extend `openai_mcp/` rather than making a new directory. Examples:
  xAI (`https://api.x.ai/v1`), Groq (`https://api.groq.com/openai/v1`),
  DeepSeek (`https://api.deepseek.com/v1`), Ollama
  (`http://localhost:11434/v1`). Use the OpenAI SDK's `base_url` parameter.
  Register a new tool like `xai_quick_query` in `openai_mcp/server.py`, or
  fork `agent.py` into `xai_agent.py` if it gets unwieldy.
- No → new directory `servers/<provider>_mcp/`, new console-script entry in
  `pyproject.toml`.

## Required files

```
servers/<provider>_mcp/
├── __init__.py        # empty
├── server.py          # FastMCP tool decorators, key assertion at import
└── client.py          # or agent.py — SDK-specific construction
```

## `server.py` template checklist

- [ ] `from mcp.server.fastmcp import FastMCP` → `mcp = FastMCP("<name>")`
- [ ] `require_env("<PROVIDER>_API_KEY", hint="...")` at module top, outside
      any function. Fail fast, not at first tool call.
- [ ] Three tools, each wrapped in `try/except` that catches `Exception` and
      returns `classify("<name>", exc).to_tool_response()`.
- [ ] Every success path returns `ok(data, provider="<name>", model=..., usage=...)`.
- [ ] `def main(): mcp.run(transport="stdio")` and `if __name__ == "__main__": main()`.

## `pyproject.toml` additions

```toml
[project.optional-dependencies]
<provider> = ["<sdk-name>>=X.Y"]

[project.scripts]
mcp-<provider> = "servers.<provider>_mcp.server:main"
```

## Tool naming convention

`<provider>_<intent>_query` for queries. Intents used so far:

- `quick_query` — cheapest/fastest model, one-shot.
- `reasoning_query` — frontier reasoning model, slower, more expensive.
- `agent_run` — SDK-provided agent loop (only if the provider ships one).
- `multimodal_query` — image+text (only if the provider has a vision
  strength worth exposing separately).

Pick whichever of these fit the new provider; don't invent new verbs
without a reason.

## Don't

- Don't read `os.environ` directly. Use `shared.secrets.require_env` /
  `env_or`.
- Don't build success responses by hand. Use `shared.formatting.ok()` so
  the JSON shape stays uniform.
- Don't echo SDK exceptions verbatim to the user. Use
  `shared.errors.classify()` — it strips known leakage patterns.
- Don't hard-code model names in `server.py`. Read them via
  `env_or("<PROVIDER>_QUICK_MODEL", "default-name")` so users can override
  through environment variables.

## Testing a new server

1. Unit-test any SDK helpers in `client.py` / `agent.py` under `tests/`.
2. `py_compile` the whole subdirectory to catch syntax errors.
3. `python -m servers.<provider>_mcp.server` — should start and wait for
   stdio. Ctrl-C to exit.
4. `npx @modelcontextprotocol/inspector ./.venv/Scripts/python.exe -m servers.<provider>_mcp.server` —
   browser UI for interactive validation.
5. `claude mcp add -s user <name> -- ./.venv/Scripts/python.exe -m servers.<provider>_mcp.server` —
   register and verify `claude mcp list` shows ✓ Connected.
