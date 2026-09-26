// src/infrastructure/ai/null-ai-provider-adapter.ts
import type { AiAdapterResult, AiProviderAdapter } from "@/application/ai/ai-provider-port";

export function createNullAiProviderAdapter(): AiProviderAdapter {
  return {
    complete(): Promise<AiAdapterResult> {
      return Promise.resolve({
        status: "unavailable",
        providerId: "null",
        modelId: "none",
      });
    },
  };
}
