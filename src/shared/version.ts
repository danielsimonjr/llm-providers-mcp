/**
 * The version each server reports about itself, injected at build time from `package.json`.
 *
 * **Why this is not a literal.** Both entry points previously wrote the version inline, and
 * both said `"2.0.0"` while each plugin manifest said `2.1.1` — so the deployed servers
 * misreported themselves and nothing compared the two. That matters more than it looks:
 * `serverInfo.version` is the field used to prove a deploy actually landed, so while it lied,
 * a stale deploy and a healthy one were indistinguishable.
 *
 * **Why one shared module rather than a declaration in each entry.** Two entries writing the
 * same constant is two sources of truth for one fact — the shape that produced the drift in
 * the first place.
 */

// MUST be declared at module scope. Inside a function this is TS1184, which bun's
// per-file transpile does not catch and `tsc` does.
declare const __PKG_VERSION__: string;

/**
 * The injected version, or a clearly-fake fallback.
 *
 * `tsc` (`bun run build`) does not apply esbuild's `define`, so the fallback keeps a direct
 * `node dist/...` run working. It is deliberately `0.0.0-dev` rather than a plausible number:
 * a wrong-but-believable version is what this module exists to prevent.
 */
export const VERSION: string =
  typeof __PKG_VERSION__ === "string" ? __PKG_VERSION__ : "0.0.0-dev";
