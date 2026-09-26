// src/infrastructure/ai/mock-ai-provider-adapter.ts
import type {
  AiAdapterRequest,
  AiAdapterResult,
  AiProviderAdapter,
  AiToolCall,
} from "@/application/ai/ai-provider-port";
import type { AiRefusalClass } from "@/application/ai/ai-types";
import {
  mapAdapterTextOutcome,
  normalizeRefusalCandidate,
} from "@/application/ai/normalize-adapter-refusal";

export type MockAiScript =
  | { type: "unavailable" }
  | { type: "timeout" }
  | { type: "error"; code?: string }
  | { type: "tool_calls"; calls: AiToolCall[] }
  | { type: "refusal"; refusalClass: AiRefusalClass }
  | { type: "message"; message: string }
  | { type: "sequence"; steps: MockAiScript[] };

export type MockAiProviderOptions = {
  script?: MockAiScript | ((request: AiAdapterRequest) => MockAiScript);
  providerId?: string;
  modelId?: string;
};

function toResult(
  script: MockAiScript,
  providerId: string,
  modelId: string,
): AiAdapterResult {
  if (script.type === "sequence") {
    const [first] = script.steps;
    return first
      ? toResult(first, providerId, modelId)
      : { status: "error", code: "empty_script", providerId, modelId };
  }

  if (script.type === "unavailable") {
    return { status: "unavailable", providerId, modelId };
  }
  if (script.type === "timeout") {
    return { status: "timeout", providerId, modelId };
  }
  if (script.type === "error") {
    return { status: "error", code: script.code ?? "mock_error", providerId, modelId };
  }
  if (script.type === "tool_calls") {
    return { status: "tool_calls", toolCalls: script.calls, providerId, modelId };
  }
  if (script.type === "refusal") {
    const normalized = normalizeRefusalCandidate(script.refusalClass);
    if (normalized.kind !== "refusal") {
      return { status: "error", code: "malformed_refusal", providerId, modelId };
    }
    return { status: "refusal", refusalClass: normalized.refusalClass, providerId, modelId };
  }
  return mapAdapterTextOutcome(script.message, { providerId, modelId });
}

export function createMockAiProviderAdapter(
  options: MockAiProviderOptions = {},
): AiProviderAdapter {
  const providerId = options.providerId ?? "mock";
  const modelId = options.modelId ?? "fixture";
  const defaultScript: MockAiScript = { type: "unavailable" };

  return {
    complete(request: AiAdapterRequest): Promise<AiAdapterResult> {
      const script =
        typeof options.script === "function"
          ? options.script(request)
          : (options.script ?? defaultScript);
      return Promise.resolve(toResult(script, providerId, modelId));
    },
  };
}
