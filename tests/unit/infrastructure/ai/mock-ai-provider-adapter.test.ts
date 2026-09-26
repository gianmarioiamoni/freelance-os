// tests/unit/infrastructure/ai/mock-ai-provider-adapter.test.ts
import { describe, expect, it } from "vitest";

import type { AiAdapterRequest } from "@/application/ai/ai-provider-port";
import { createMockAiProviderAdapter } from "@/infrastructure/ai/mock-ai-provider-adapter";

const request: AiAdapterRequest = {
  system: "system",
  user: "Come sto andando questo mese?",
  toolDescriptors: [],
  timeoutMs: 8_000,
  correlationId: "corr-mock",
};

describe("createMockAiProviderAdapter", () => {
  it("returns scripted tool calls, refusals, timeout, and error", async () => {
    await expect(
      createMockAiProviderAdapter({
        script: { type: "tool_calls", calls: [{ name: "get_current_month_analytics", args: {} }] },
      }).complete(request),
    ).resolves.toMatchObject({ status: "tool_calls" });

    await expect(
      createMockAiProviderAdapter({
        script: { type: "message", message: JSON.stringify({ refusal: "write_forbidden" }) },
      }).complete(request),
    ).resolves.toMatchObject({ status: "message" });

    await expect(
      createMockAiProviderAdapter({ script: { type: "timeout" } }).complete(request),
    ).resolves.toMatchObject({ status: "timeout", providerId: "mock" });

    await expect(
      createMockAiProviderAdapter({ script: { type: "error", code: "5xx" } }).complete(request),
    ).resolves.toMatchObject({ status: "error", code: "5xx" });
  });

  it("defaults to unavailable when no script is provided", async () => {
    await expect(createMockAiProviderAdapter().complete(request)).resolves.toMatchObject({
      status: "unavailable",
    });
  });
});
