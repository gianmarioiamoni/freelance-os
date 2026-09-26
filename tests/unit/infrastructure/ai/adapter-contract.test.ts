// tests/unit/infrastructure/ai/adapter-contract.test.ts
import { describe, expect, it } from "vitest";

import type { AiAdapterRequest, AiProviderAdapter } from "@/application/ai/ai-provider-port";
import { createMockAiProviderAdapter } from "@/infrastructure/ai/mock-ai-provider-adapter";
import { createNullAiProviderAdapter } from "@/infrastructure/ai/null-ai-provider-adapter";

const request: AiAdapterRequest = {
  system: "system",
  user: "question",
  toolDescriptors: [],
  timeoutMs: 8_000,
  correlationId: "corr-1",
};

function assertAdapterContract(adapter: AiProviderAdapter): void {
  expect(typeof adapter.complete).toBe("function");
}

describe("AiProviderAdapter contract", () => {
  it("is implemented by Null and Mock without executing tools", async () => {
    const nullAdapter = createNullAiProviderAdapter();
    const mockAdapter = createMockAiProviderAdapter({
      script: { type: "tool_calls", calls: [{ name: "get_current_month_analytics", args: {} }] },
    });

    assertAdapterContract(nullAdapter);
    assertAdapterContract(mockAdapter);

    await expect(nullAdapter.complete(request)).resolves.toMatchObject({
      status: "unavailable",
      providerId: "null",
    });
    await expect(mockAdapter.complete(request)).resolves.toMatchObject({
      status: "tool_calls",
      providerId: "mock",
    });

    await expect(
      createMockAiProviderAdapter({
        script: { type: "refusal", refusalClass: "unsupported_capability" },
      }).complete(request),
    ).resolves.toMatchObject({
      status: "refusal",
      refusalClass: "unsupported_capability",
      providerId: "mock",
    });
  });
});
