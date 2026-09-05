import { describe, it, expect, afterEach } from "bun:test";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { appendStartupHeartbeat } from "../src/shared/logging.js";

const provider = "testprov";
const logPath = join(homedir(), ".claude", `llm-${provider}-startup.log`);
afterEach(() => { if (existsSync(logPath)) rmSync(logPath); });

describe("appendStartupHeartbeat", () => {
  it("writes a heartbeat line with pid and node version", () => {
    appendStartupHeartbeat(provider);
    const content = readFileSync(logPath, "utf8").trim();
    expect(content).toMatch(/pid=\d+/);
    expect(content).toMatch(/key_present=(true|false)/);
    expect(content).toContain(`node=${process.version}`);
  });
  it("never throws (best-effort)", () => {
    expect(() => appendStartupHeartbeat(provider)).not.toThrow();
  });
});
