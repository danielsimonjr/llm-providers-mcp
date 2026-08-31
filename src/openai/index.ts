#!/usr/bin/env node
import { requireEnv } from "../shared/secrets.js";
import { appendStartupHeartbeat } from "../shared/logging.js";
import { TOOLS, makeHandlers } from "./tools.js";
import { classify } from "../shared/errors.js";
import { VERSION } from "../shared/version.js";
import { startStdioMcpServer } from "../shared/mcp-server.js";

appendStartupHeartbeat("openai");

requireEnv("OPENAI_API_KEY", "Get one from https://platform.openai.com/api-keys and set it.");

startStdioMcpServer({
  name: "openai-mcp",
  version: VERSION,
  tools: TOOLS,
  handlers: makeHandlers(),
  classify: (err) => classify("openai", err),
  logLabel: "openai-mcp",
});
