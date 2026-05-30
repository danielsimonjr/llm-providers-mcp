import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function callRaw(entry: string, env: Record<string, string>, toolName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(root, "dist", entry, "index.js")], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buf = "";
    let stderr = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("timeout. stderr: " + stderr)); }, 15000);
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.stdout.on("data", (d) => {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id === 2) {
          clearTimeout(timer); child.kill();
          const text = msg.result?.content?.[0]?.text;
          resolve({ isError: msg.result?.isError, parsed: text ? JSON.parse(text) : null });
        }
      }
    });
    child.on("error", reject);
    const send = (o: unknown) => child.stdin.write(JSON.stringify(o) + "\n");
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "errtest", version: "0" } } });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: toolName, arguments: {} } });
  });
}

describe("index unknown-tool error shape", () => {
  it("gemini returns the contract error shape for an unknown tool", async () => {
    const r = await callRaw("gemini", { GEMINI_API_KEY: "dummy" }, "no_such_tool");
    expect(r.isError).toBe(true);
    expect(r.parsed.ok).toBe(false);
    expect(r.parsed.error).toMatchObject({ provider: "gemini", kind: "unknown", retry_after_seconds: null });
    expect(typeof r.parsed.error.message).toBe("string");
  }, 20000);
  it("openai returns the contract error shape for an unknown tool", async () => {
    const r = await callRaw("openai", { OPENAI_API_KEY: "dummy" }, "no_such_tool");
    expect(r.isError).toBe(true);
    expect(r.parsed.ok).toBe(false);
    expect(r.parsed.error).toMatchObject({ provider: "openai", kind: "unknown", retry_after_seconds: null });
    expect(typeof r.parsed.error.message).toBe("string");
  }, 20000);
});
