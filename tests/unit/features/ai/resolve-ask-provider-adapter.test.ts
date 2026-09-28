// tests/unit/features/ai/resolve-ask-provider-adapter.test.ts
import { describe, expect, it } from "vitest";

import { resolveAskProviderAdapter } from "@/features/ai/resolve-ask-provider-adapter";

const request = {
  system: "test",
  user: "Come sto andando questo mese?",
  toolDescriptors: [],
  timeoutMs: 1000,
  correlationId: "corr-1",
};

describe("resolveAskProviderAdapter", () => {
  it("keeps the Null adapter as the production default", async () => {
    const result = await resolveAskProviderAdapter({}).complete(request);
    expect(result).toMatchObject({ status: "unavailable", providerId: "null" });
  });

  it("uses the scripted mock only when AI_E2E_MOCK is true", async () => {
    const result = await resolveAskProviderAdapter({ AI_E2E_MOCK: "true" }).complete(request);
    expect(result.status).toBe("tool_calls");
  });

  it("returns Null when AI_PRODUCTION_ENABLED is true but credentials are missing", async () => {
    const result = await resolveAskProviderAdapter({
      AI_PRODUCTION_ENABLED: "true",
    }).complete(request);
    expect(result).toMatchObject({ status: "unavailable", providerId: "null" });
  });

  it("returns Null when AI_PRODUCTION_ENABLED is true but baseUrl is missing", async () => {
    const result = await resolveAskProviderAdapter({
      AI_PRODUCTION_ENABLED: "true",
      AI_PRODUCTION_API_KEY: "test-key",
      AI_PRODUCTION_MODEL: "test-model",
    }).complete(request);
    expect(result).toMatchObject({ status: "unavailable", providerId: "null" });
  });

  it("returns Null when AI_PRODUCTION_ENABLED is true but apiKey is missing", async () => {
    const result = await resolveAskProviderAdapter({
      AI_PRODUCTION_ENABLED: "true",
      AI_PRODUCTION_BASE_URL: "https://api.anthropic.com/v1",
      AI_PRODUCTION_MODEL: "test-model",
    }).complete(request);
    expect(result).toMatchObject({ status: "unavailable", providerId: "null" });
  });

  it("returns Null when AI_PRODUCTION_ENABLED is true but modelId is missing", async () => {
    const result = await resolveAskProviderAdapter({
      AI_PRODUCTION_ENABLED: "true",
      AI_PRODUCTION_BASE_URL: "https://api.anthropic.com/v1",
      AI_PRODUCTION_API_KEY: "test-key",
    }).complete(request);
    expect(result).toMatchObject({ status: "unavailable", providerId: "null" });
  });

  it("returns Anthropic adapter when all production credentials are present", async () => {
    const adapter = resolveAskProviderAdapter({
      AI_PRODUCTION_ENABLED: "true",
      AI_PRODUCTION_BASE_URL: "https://api.anthropic.com/v1",
      AI_PRODUCTION_API_KEY: "test-key",
      AI_PRODUCTION_MODEL: "claude-haiku-4-5-20251001",
    });

    const result = await adapter.complete({
      ...request,
      timeoutMs: 100,
    });

    // Should attempt to call Anthropic (will fail/timeout without real credentials)
    // This test validates the adapter is created and attempts execution
    expect(result.providerId).toBe("anthropic");
  });
});
