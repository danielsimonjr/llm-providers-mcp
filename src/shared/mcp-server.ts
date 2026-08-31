import { Server } from "@modelcontextprotocol/server";
import type { Tool } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import type { ProviderError } from "./errors.js";

export interface ToolServerConfig {
  name: string;
  version: string;
  tools: Tool[];
  handlers: Record<string, (args: Record<string, unknown>) => Promise<string>>;
  classify: (err: unknown) => ProviderError;
  logLabel: string;
}

export function buildToolServer(config: ToolServerConfig): Server {
  const server = new Server(
    { name: config.name, version: config.version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler("tools/list", async () => ({ tools: config.tools }));

  server.setRequestHandler("tools/call", async (request) => {
    const { name, arguments: args } = request.params;
    const handler = config.handlers[name];
    if (!handler) {
      const text = JSON.stringify(
        config.classify(new Error(`unknown tool '${name}'`)).toToolResponse(),
      );
      return { content: [{ type: "text", text }], isError: true };
    }
    try {
      const text = await handler((args ?? {}) as Record<string, unknown>);
      return { content: [{ type: "text", text }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${config.logLabel}: handler '${name}' threw: ${msg}\n`);
      const text = JSON.stringify(config.classify(err).toToolResponse());
      return { content: [{ type: "text", text }], isError: true };
    }
  });

  return server;
}

/**
 * Start stdio MCP serving both the 2026-07-28 revision and legacy initialize clients.
 * `serveStdio` pins one server instance per connection and selects the protocol era
 * from the opening exchange — the v2 entry required for MCP 2026-07-28 compliance.
 */
export function startStdioMcpServer(config: ToolServerConfig): void {
  serveStdio(() => buildToolServer(config));
  process.stderr.write(`${config.logLabel}: connected on stdio\n`);
}
