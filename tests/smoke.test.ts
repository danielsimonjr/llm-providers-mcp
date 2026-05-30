import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function listTools(entry: string, env: Record<string, string>): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(root, "dist", entry, "index.js")], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buf = "";
    let stderr = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("timeout waiting for tools/list. stderr: " + stderr)); }, 15000);
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.stdout.on("data", (d) => {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === 2 && msg.result?.tools) {
            clearTimeout(timer); child.kill();
            resolve(msg.result.tools.map((t: any) => t.name).sort());
          }
        } catch { /* partial or non-JSON line */ }
      }
    });
    child.on("error", reject);
    const send = (o: unknown) => child.stdin.write(JSON.stringify(o) + "\n");
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "0" } } });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  });
}

describe("smoke: tool registration", () => {
  it("gemini entrypoint lists its 3 tools", async () => {
    const names = await listTools("gemini", { GEMINI_API_KEY: "dummy-for-startup" });
    expect(names).toEqual(["gemini_multimodal_query", "gemini_quick_query", "gemini_reasoning_query"]);
  }, 20000);
  it("openai entrypoint lists its 3 tools", async () => {
    const names = await listTools("openai", { OPENAI_API_KEY: "dummy-for-startup" });
    expect(names).toEqual(["openai_agent_run", "openai_quick_query", "openai_reasoning_query"]);
  }, 20000);
});
