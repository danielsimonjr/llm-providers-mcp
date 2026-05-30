export class MissingCredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingCredentialError";
  }
}

export function requireEnv(name: string, hint?: string): string {
  const value = process.env[name];
  if (!value) {
    let msg = `Environment variable '${name}' is required but not set.`;
    if (hint) msg += ` ${hint}`;
    throw new MissingCredentialError(msg);
  }
  return value;
}

export function envOr(name: string, fallback: string): string {
  const value = process.env[name];
  return value ? value : fallback;
}

export function redact(value: string, keep = 4): string {
  if (!value) return "<empty>";
  if (value.length <= keep) return "*".repeat(value.length);
  return value.slice(0, keep) + "..." + "******";
}
