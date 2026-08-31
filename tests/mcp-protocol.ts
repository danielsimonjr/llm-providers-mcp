import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const MODERN_ENVELOPE = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientInfo": { name: "test", version: "0" },
  "io.modelcontextprotocol/clientCapabilities": {},
} as const;

type JsonRpcMessage = {
  id?: number;
  result?: { tools?: Array<{ name: string }>; content?: Array<{ text?: string }>; isError?: boolean };
};

export function spawnServer(entry: string, env: Record<string, string>): ChildProcessWithoutNullStreams {
  return spawn(process.execPath, [join(root, "dist", entry, "index.js")], {
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export function exchange(
  child: ChildProcessWithoutNullStreams,
  outbound: unknown[],
  match: (msg: JsonRpcMessage) => boolean,
  timeoutMs = 15000,
): Promise<JsonRpcMessage> {
  return new Promise((resolve, reject) => {
    let buf = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timeout waiting for MCP response. stderr: ${stderr}`));
    }, timeoutMs);

    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.stdout.on("data", (d) => {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line) as JsonRpcMessage;
          if (match(msg)) {
            clearTimeout(timer);
            child.kill();
            resolve(msg);
          }
        } catch {
          /* partial or non-JSON line */
        }
      }
    });

    child.on("error", reject);

    const send = (o: unknown) => child.stdin.write(JSON.stringify(o) + "\n");
    for (const msg of outbound) send(msg);
  });
}

export function legacyToolsListSequence(listId = 2) {
  return [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      },
    },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: listId, method: "tools/list", params: {} },
  ];
}

export function modernToolsListSequence(listId = 1) {
  return [
    {
      jsonrpc: "2.0",
      id: listId,
      method: "tools/list",
      params: { _meta: MODERN_ENVELOPE },
    },
  ];
}
