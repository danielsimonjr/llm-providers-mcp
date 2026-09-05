---
name: Bug report
about: Report a defect so we can fix it
title: "bug: "
labels: bug
---

## What happened

<!-- One or two sentences. What did you expect, what did you get? -->

## Repro

<!-- Minimal steps. Paste the exact `claude mcp` command or tool invocation. -->

```
claude mcp list
# or:
bun test
```

## Environment

- OS:
- Bun version (`bun --version`):
- Node version (`node --version`):
- `claude --version`:
- Package versions (`bun pm ls @openai/agents @google/genai @modelcontextprotocol/server`):

## Output / stack trace

<!-- Paste full output. Redact key values; our redactor prints `sk-...******`
     — if you see anything beyond that, include it verbatim so we can trace
     the leak. -->

```
<paste here>
```

## Notes

<!-- Anything else you tried or suspect. -->
