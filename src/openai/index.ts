#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { requireEnv } from "../shared/secrets.js";
import { appendStartupHeartbeat } from "../shared/logging.js";
import { TOOLS, makeHandlers } from "./tools.js";
import { classify } from "../shared/errors.js";
import { VERSION } from "../shared/version.js";

appendStartupHeartbeat("openai");

requireEnv("OPENAI_API_KEY", "Get one from https://platform.openai.com/api-keys and set it.");

const HANDLERS = makeHandlers();

const server = new Server(
  { name: "openai-mcp", version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = HANDLERS[name];
  if (!handler) {
    const text = JSON.stringify(classify("openai", new Error(`unknown tool '${name}'`)).toToolResponse());
    return { content: [{ type: "text", text }], isError: true };
  }
  try {
    const text = await handler(args ?? {});
    return { content: [{ type: "text", text }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`openai-mcp: handler '${name}' threw: ${msg}\n`);
    const text = JSON.stringify(classify("openai", err).toToolResponse());
    return { content: [{ type: "text", text }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("openai-mcp: connected on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`openai-mcp: fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
