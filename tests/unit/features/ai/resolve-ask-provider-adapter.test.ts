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
});
