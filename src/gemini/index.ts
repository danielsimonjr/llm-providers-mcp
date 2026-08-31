#!/usr/bin/env node
import { requireEnv } from "../shared/secrets.js";
import { appendStartupHeartbeat } from "../shared/logging.js";
import { TOOLS, makeHandlers } from "./tools.js";
import { classify } from "../shared/errors.js";
import { VERSION } from "../shared/version.js";
import { startStdioMcpServer } from "../shared/mcp-server.js";

appendStartupHeartbeat("gemini");

requireEnv("GEMINI_API_KEY", "Get one from https://aistudio.google.com/apikey and set it.");

startStdioMcpServer({
  name: "gemini-mcp",
  version: VERSION,
  tools: TOOLS,
  handlers: makeHandlers(),
  classify: (err) => classify("gemini", err),
  logLabel: "gemini-mcp",
});
