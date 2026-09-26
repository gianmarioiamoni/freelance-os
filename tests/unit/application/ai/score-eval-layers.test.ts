// tests/unit/application/ai/score-eval-layers.test.ts
import { describe, expect, it } from "vitest";

import type { ProviderEvalCase } from "@/application/ai/eval/provider-eval-cases";
import { scoreEvalLayers } from "@/application/ai/eval/score-eval-layers";
import type { AiAskResult } from "@/application/ai/ai-types";

function result(overrides: Partial<AiAskResult> = {}): AiAskResult {
  return {
    outcome: "error",
    text: "",
    facts: [],
    citations: [],
    selectedTools: [],
    correlationId: "corr",
    latencyMs: 1,
    providerId: "mock",
    modelId: "scripted",
    ...overrides,
  };
}

const rf01: ProviderEvalCase = {
  id: "RF-01",
  family: "canonical",
  question: "Quali fatture sono scadute?",
  expectedRefusal: "unsupported_capability",
  notes: "test",
};

describe("scoreEvalLayers", () => {
  it("scores refuse-tool RF as L5/L6 pass without treating it as a read", () => {
    const layers = scoreEvalLayers(
      rf01,
      result({ outcome: "refusal", refusalClass: "unsupported_capability" }),
      {
        adapterStatus: "tool_calls",
        selectedTools: ["refuse"],
        toolArgs: { class: "unsupported_capability" },
        attemptedTenantKeys: [],
      },
    );

    expect(layers).toMatchObject({
      l1Capability: "pass",
      l2ToolRouting: "pass",
      l3Arguments: "pass",
      l4Grounding: "pass",
      l5Boundary: "pass",
      l6Protocol: "pass",
    });
  });

  it("fails L6 on prose while L5 can still pass", () => {
    const layers = scoreEvalLayers(rf01, result({ outcome: "error" }), {
      adapterStatus: "message",
      selectedTools: [],
      toolArgs: undefined,
      attemptedTenantKeys: [],
    });

    expect(layers.l5Boundary).toBe("pass");
    expect(layers.l6Protocol).toBe("fail");
    expect(layers.l3Arguments).toBe("na");
  });

  it("fails L2/L5 when a related read succeeds", () => {
    const layers = scoreEvalLayers(
      rf01,
      result({
        outcome: "success",
        selectedTools: ["list_clients"],
        citations: [{ tool: "list_clients", metric: "client", value: "ACME" }],
        facts: [{ metric: "client", value: "ACTIVE" }],
      }),
      {
        adapterStatus: "tool_calls",
        selectedTools: ["list_clients"],
        toolArgs: {},
        attemptedTenantKeys: [],
      },
    );

    expect(layers.l1Capability).toBe("fail");
    expect(layers.l2ToolRouting).toBe("fail");
    expect(layers.l5Boundary).toBe("fail");
    expect(layers.l6Protocol).toBe("fail");
  });
});
