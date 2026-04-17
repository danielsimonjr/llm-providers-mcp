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
<python -c "..."> output
```

## Environment

- OS:
- Python version (`python --version`):
- `uv --version` (if used):
- `claude --version`:
- Provider SDK versions (`pip show openai-agents google-genai`):

## Output / stack trace

<!-- Paste full output. Redact key values; our redactor prints `sk-...******`
     — if you see anything beyond that, include it verbatim so we can trace
     the leak. -->

```
<paste here>
```

## Notes

<!-- Anything else you tried or suspect. -->
