import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Gate: `package.json` is the ONLY source of the shipped version.
 *
 * This repo carried the version in THREE places — `package.json` plus a `plugin.json` for each
 * shipped plugin — with nothing comparing them, and both entry points wrote it a fourth time as
 * a string literal. They drifted: the manifests said `2.1.1`, the servers reported `2.0.0`, and
 * `package.json` said `2.0.0`. Nothing failed, because nothing looked.
 *
 * That is worse than untidy. `serverInfo.version` is the field used to prove a deploy landed,
 * so while it disagreed with the manifest, a stale deploy and a healthy one were
 * indistinguishable — the check returned a confident wrong answer.
 *
 * The literals are gone (the version is injected at build time from `package.json`), and this
 * pins the manifests to the same source so the drift cannot reappear silently.
 */

const ROOT = join(__dirname, "..");
const PLUGINS = ["llm-gemini", "llm-openai"];

function readJson(...parts: string[]): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ROOT, ...parts), "utf8"));
}

describe("version consistency", () => {
  const pkgVersion = readJson("package.json").version as string;

  it("package.json declares a version", () => {
    expect(pkgVersion).toMatch(/^\d+\.\d+\.\d+/);
  });

  it.each(PLUGINS)("%s/plugin.json matches package.json", (plugin) => {
    const manifest = readJson("plugins", plugin, ".claude-plugin", "plugin.json");
    expect(manifest.version).toBe(pkgVersion);
  });

  // The literals are what actually drifted, so their absence is asserted rather than assumed.
  it.each([
    ["gemini", "src/gemini/index.ts"],
    ["openai", "src/openai/index.ts"],
  ])("%s entry takes its version from the shared module, not a literal", (_name, rel) => {
    const source = readFileSync(join(ROOT, rel), "utf8");
    expect(source).toContain("version: VERSION");
    expect(source).toMatch(/from "\.\.\/shared\/version\.js"/);
    // A hardcoded semver in the Server() constructor is the exact defect being prevented.
    expect(source).not.toMatch(/version:\s*["']\d+\.\d+\.\d+["']/);
  });
});
