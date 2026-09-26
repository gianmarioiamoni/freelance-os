// src/features/ai/resolve-ask-provider-adapter.ts
import type { AiProviderAdapter } from "@/application/ai/ai-provider-port";
import { e2eAskScript } from "@/features/ai/e2e-ask-script";
import { createMockAiProviderAdapter } from "@/infrastructure/ai/mock-ai-provider-adapter";
import { createNullAiProviderAdapter } from "@/infrastructure/ai/null-ai-provider-adapter";

export const AI_E2E_MOCK_ENV = "AI_E2E_MOCK";

export function resolveAskProviderAdapter(
  env: Record<string, string | undefined> = process.env,
): AiProviderAdapter {
  if (env[AI_E2E_MOCK_ENV] === "true") {
    return createMockAiProviderAdapter({ script: e2eAskScript });
  }

  return createNullAiProviderAdapter();
}
