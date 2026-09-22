import type { Tool } from "@modelcontextprotocol/server";

/**
 * Enforce the argument contract a tool ALREADY declares in its `inputSchema`.
 *
 * Why this exists: `tools/call` used to dispatch straight to the handler, so
 * `required` and `additionalProperties: false` were advertised to clients and
 * never enforced. A caller that passed `query:` instead of `prompt:` therefore
 * reached the vendored provider SDK with `undefined`, and the SDK reported the
 * failure in ITS vocabulary ("originalInput is not iterable") — which points a
 * reader into a bundled dependency instead of at the call site. A bundled
 * third-party SDK should never be the thing that names our bug.
 *
 * Deliberately a MINIMAL subset of JSON Schema — `required`, primitive `type`,
 * and `additionalProperties: false` — because that is all these tool schemas
 * use. It is not a general validator, and adding a schema construct to a tool
 * means extending this function. That trade keeps the bundled server
 * dependency-free; it is a choice, not an oversight.
 *
 * @returns a human-readable message naming the offending argument, or `null`
 *          when the call satisfies the declared schema.
 */
export function validateArgs(tool: Tool, args: Record<string, unknown>): string | null {
  const schema = tool.inputSchema as
    | {
        properties?: Record<string, { type?: string }>;
        required?: string[];
        additionalProperties?: boolean;
      }
    | undefined;
  if (!schema?.properties) return null;

  const where = (name: string) => `${tool.name}: '${name}'`;
  const accepted = Object.keys(schema.properties);
  const acceptedList = `accepted arguments are: ${accepted.join(", ")}`;

  const unknown =
    schema.additionalProperties === false
      ? Object.keys(args).find((name) => !accepted.includes(name))
      : undefined;
  const missing = (schema.required ?? []).find((name) => args[name] === undefined);

  // A misnamed argument makes BOTH faults true at once: the required field is
  // absent AND an unrecognised one was supplied. Reporting only one half hides
  // the half that tells the caller what to type, so name both.
  if (missing && unknown) {
    return `${where(missing)} is required and was not supplied (received unknown argument '${unknown}'; ${acceptedList})`;
  }
  if (missing) return `${where(missing)} is required and was not supplied`;
  if (unknown) return `${tool.name}: unknown argument '${unknown}'; ${acceptedList}`;

  for (const [name, spec] of Object.entries(schema.properties)) {
    const value = args[name];
    if (value === undefined) continue; // absent-and-optional; required was checked above
    const actual = Array.isArray(value) ? "array" : typeof value;
    const expected = spec.type;
    if (expected && actual !== expected) {
      return `${where(name)} must be ${expected === "array" ? "an" : "a"} ${expected}, received ${actual}`;
    }
  }

  return null;
}
