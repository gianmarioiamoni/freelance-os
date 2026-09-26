// src/application/ai/parse-provider-envelope.ts
import type { AiRefusalClass } from "@/application/ai/ai-types";
import type { AiToolCall } from "@/application/ai/ai-provider-port";

export type ParsedProviderEnvelope =
  | { kind: "tool_calls"; toolCalls: AiToolCall[] }
  | { kind: "message"; message: string }
  | { kind: "refusal"; refusalClass: AiRefusalClass }
  | { kind: "malformed" };

const REFUSAL_CLASSES = new Set<AiRefusalClass>([
  "unsupported_capability",
  "write_forbidden",
  "ambiguous_entity",
  "invalid_period",
  "provider_unavailable",
  "injection",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseToolCalls(value: unknown): AiToolCall[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const calls: AiToolCall[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.name !== "string" || item.name.length === 0) {
      return null;
    }
    calls.push({ name: item.name, args: item.args });
  }
  return calls;
}

/**
 * Application-enforced JSON plan for runtimes without native tool calling.
 * Native tool_calls bypass this parser and are still validated later.
 */
export function parseProviderEnvelope(message: string): ParsedProviderEnvelope {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { kind: "malformed" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return { kind: "malformed" };
    }
    return { kind: "message", message: trimmed };
  }

  if (!isRecord(parsed)) {
    return { kind: "malformed" };
  }

  if (typeof parsed.refusal === "string" && REFUSAL_CLASSES.has(parsed.refusal as AiRefusalClass)) {
    return { kind: "refusal", refusalClass: parsed.refusal as AiRefusalClass };
  }

  const toolCalls = parseToolCalls(parsed.toolCalls);
  if (toolCalls) {
    return { kind: "tool_calls", toolCalls };
  }

  if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
    return { kind: "message", message: parsed.message.trim() };
  }

  return { kind: "malformed" };
}
