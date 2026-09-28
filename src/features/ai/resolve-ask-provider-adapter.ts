// src/features/ai/resolve-ask-provider-adapter.ts
import type { AiProviderAdapter } from "@/application/ai/ai-provider-port";
import { e2eAskScript } from "@/features/ai/e2e-ask-script";
import { createEvalAnthropicAiProviderAdapter } from "@/infrastructure/ai/eval-anthropic-ai-provider-adapter";
import { createMockAiProviderAdapter } from "@/infrastructure/ai/mock-ai-provider-adapter";
import { createNullAiProviderAdapter } from "@/infrastructure/ai/null-ai-provider-adapter";

export const AI_E2E_MOCK_ENV = "AI_E2E_MOCK";
export const AI_PRODUCTION_ENABLED_ENV = "AI_PRODUCTION_ENABLED";
export const AI_PRODUCTION_BASE_URL_ENV = "AI_PRODUCTION_BASE_URL";
export const AI_PRODUCTION_API_KEY_ENV = "AI_PRODUCTION_API_KEY";
export const AI_PRODUCTION_MODEL_ENV = "AI_PRODUCTION_MODEL";

/**
 * Selected production provider: Anthropic Claude Haiku 4.5
 * Model: claude-haiku-4-5-20251001
 * Selection basis: §8.5 v2 eligible at retest 91d58d7
 * Status: PROVIDER SELECTED / NOT YET CERTIFIED
 */
export function resolveAskProviderAdapter(
  env: Record<string, string | undefined> = process.env,
): AiProviderAdapter {
  if (env[AI_E2E_MOCK_ENV] === "true") {
    return createMockAiProviderAdapter({ script: e2eAskScript });
  }

  if (env[AI_PRODUCTION_ENABLED_ENV] === "true") {
    const baseUrl = env[AI_PRODUCTION_BASE_URL_ENV];
    const apiKey = env[AI_PRODUCTION_API_KEY_ENV];
    const modelId = env[AI_PRODUCTION_MODEL_ENV];

    if (!baseUrl || !apiKey || !modelId) {
      return createNullAiProviderAdapter();
    }

    return createEvalAnthropicAiProviderAdapter({
      baseUrl,
      apiKey,
      modelId,
      providerId: "anthropic",
    });
  }

  return createNullAiProviderAdapter();
}
