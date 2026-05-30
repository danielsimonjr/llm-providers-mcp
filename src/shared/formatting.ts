export interface OkResponse {
  ok: true;
  provider: string;
  model: string;
  usage: Record<string, unknown>;
  data: unknown;
}

export function ok(
  data: unknown,
  opts: { provider: string; model: string; usage?: Record<string, unknown> | null },
): OkResponse {
  return {
    ok: true,
    provider: opts.provider,
    model: opts.model,
    usage: opts.usage ?? {},
    data,
  };
}
