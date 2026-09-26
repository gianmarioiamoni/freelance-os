// src/application/ai/normalize-adapter-refusal.ts
import type { AiAdapterResult } from "@/application/ai/ai-provider-port";
import type { AiRefusalClass, AiUsage } from "@/application/ai/ai-types";

export const AI_REFUSAL_CLASSES: readonly AiRefusalClass[] = [
  "unsupported_capability",
  "write_forbidden",
  "ambiguous_entity",
  "unknown_entity",
  "invalid_period",
  "provider_unavailable",
  "injection",
];

export type NormalizedRefusal =
  | { kind: "refusal"; refusalClass: AiRefusalClass }
  | { kind: "malformed_refusal" }
  | { kind: "not_refusal" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAiRefusalClass(value: unknown): value is AiRefusalClass {
  return typeof value === "string" && AI_REFUSAL_CLASSES.includes(value as AiRefusalClass);
}

/**
 * Provider-neutral refusal normalizer. Accepts only a controlled class.
 * Does not parse prose. Extra keys fail closed so facts cannot ride along.
 */
export function normalizeRefusalCandidate(candidate: unknown): NormalizedRefusal {
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (isAiRefusalClass(trimmed)) {
      return { kind: "refusal", refusalClass: trimmed };
    }
    if (trimmed.length === 0) {
      return { kind: "not_refusal" };
    }
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return normalizeRefusalCandidate(JSON.parse(trimmed));
      } catch {
        return trimmed.includes("refusal") ? { kind: "malformed_refusal" } : { kind: "not_refusal" };
      }
    }
    return { kind: "not_refusal" };
  }

  if (!isRecord(candidate) || !("refusal" in candidate)) {
    return { kind: "not_refusal" };
  }

  const extraKeys = Object.keys(candidate).filter((key) => key !== "refusal");
  if (extraKeys.length > 0 || !isAiRefusalClass(candidate.refusal)) {
    return { kind: "malformed_refusal" };
  }

  return { kind: "refusal", refusalClass: candidate.refusal };
}

export function mapAdapterTextOutcome(
  text: string,
  meta: { providerId: string; modelId: string; usage?: AiUsage },
): Extract<AiAdapterResult, { status: "refusal" | "message" | "error" }> {
  const normalized = normalizeRefusalCandidate(text);
  if (normalized.kind === "refusal") {
    return {
      status: "refusal",
      refusalClass: normalized.refusalClass,
      providerId: meta.providerId,
      modelId: meta.modelId,
      usage: meta.usage,
    };
  }
  if (normalized.kind === "malformed_refusal") {
    return {
      status: "error",
      code: "malformed_refusal",
      providerId: meta.providerId,
      modelId: meta.modelId,
    };
  }
  return {
    status: "message",
    message: text,
    providerId: meta.providerId,
    modelId: meta.modelId,
    usage: meta.usage,
  };
}
