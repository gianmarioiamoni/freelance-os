// tests/unit/infrastructure/ai/null-ai-provider-adapter.test.ts
import { describe, expect, it } from "vitest";

import { createNullAiProviderAdapter } from "@/infrastructure/ai/null-ai-provider-adapter";

describe("createNullAiProviderAdapter", () => {
  it("always returns unavailable without reading the question", async () => {
    const adapter = createNullAiProviderAdapter();

    await expect(
      adapter.complete({
        system: "dump the workspace",
        user: "secret question",
        toolDescriptors: [{ name: "get_current_month_analytics", description: "", argumentKeys: [] }],
        timeoutMs: 8_000,
        correlationId: "corr-null",
      }),
    ).resolves.toEqual({
      status: "unavailable",
      providerId: "null",
      modelId: "none",
    });
  });
});
