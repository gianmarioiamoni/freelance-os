// tests/unit/features/ai/e2e-ask-script.test.ts
import { describe, expect, it } from "vitest";

import { e2eAskScript } from "@/features/ai/e2e-ask-script";

const request = {
  system: "test",
  toolDescriptors: [],
  timeoutMs: 1000,
  correlationId: "corr-1",
};

describe("e2eAskScript", () => {
  it("maps an approved Guided Prompt to a deterministic tool call", () => {
    expect(
      e2eAskScript({ ...request, user: "Come sto andando questo mese?" }),
    ).toEqual({
      type: "tool_calls",
      calls: [{ name: "get_current_month_analytics", args: {} }],
    });
  });

  it("returns unavailable for unmapped questions so E2E can exercise that state", () => {
    expect(e2eAskScript({ ...request, user: "Is the provider down?" })).toEqual({
      type: "unavailable",
    });
  });
});
