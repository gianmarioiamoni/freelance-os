// src/application/ai/sanitize-tool-args.ts
import { FORBIDDEN_TOOL_ARG_KEYS } from "@/application/ai/ai-types";

export type SanitizedToolArgs = {
  args: Record<string, unknown>;
  strippedKeys: string[];
};

/**
 * Treats provider args as untrusted. Drops tenant/auth fields and unknown keys.
 */
export function sanitizeToolArgs(
  raw: unknown,
  allowedKeys: readonly string[],
): SanitizedToolArgs {
  if (raw === null || raw === undefined) {
    return { args: {}, strippedKeys: [] };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { args: {}, strippedKeys: [] };
  }

  const source = raw as Record<string, unknown>;
  const allowed = new Set(allowedKeys);
  const args: Record<string, unknown> = {};
  const strippedKeys: string[] = [];

  for (const key of Object.keys(source)) {
    if (
      (FORBIDDEN_TOOL_ARG_KEYS as readonly string[]).includes(key) ||
      !allowed.has(key)
    ) {
      strippedKeys.push(key);
      continue;
    }
    args[key] = source[key];
  }

  return { args, strippedKeys };
}
