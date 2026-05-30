import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// Map a provider name to the env var that holds its key, for the
// key_present diagnostic. Unknown providers report key_present=false.
const KEY_ENV: Record<string, string> = {
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
};

/**
 * Best-effort startup heartbeat. Mirrors the Python import-time heartbeat:
 * lets us tell out-of-band whether the MCP host actually spawned us after a
 * /reload-plugins. Any failure is swallowed — must never block startup.
 */
export function appendStartupHeartbeat(provider: string): void {
  try {
    const dir = join(homedir(), ".claude");
    mkdirSync(dir, { recursive: true });
    const keyEnv = KEY_ENV[provider];
    const keyPresent = keyEnv ? keyEnv in process.env : false;
    const line =
      `${new Date().toISOString()} pid=${process.pid} ` +
      `key_present=${keyPresent} node=${process.version}\n`;
    appendFileSync(join(dir, `llm-${provider}-startup.log`), line, "utf8");
  } catch {
    // swallow — heartbeat must not introduce a failure mode
  }
}
