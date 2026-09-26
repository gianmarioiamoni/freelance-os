// tests/unit/application/ai/foundation-eval.test.ts
import { describe, expect, it } from "vitest";

import { createFoundationToolRegistry } from "@/application/ai/create-foundation-registry";
import { FOUNDATION_EVAL_CASES } from "@/application/ai/eval/foundation-eval-cases";
import { askWorkspaceQuestion } from "@/application/ai/orchestrator";
import { createMockAiProviderAdapter } from "@/infrastructure/ai/mock-ai-provider-adapter";
import { createNullAiProviderAdapter } from "@/infrastructure/ai/null-ai-provider-adapter";

import { owningMembers, stubCurrentMonthAnalytics, workspaceContext } from "./ai-test-helpers";

function scriptForCase(id: string) {
  if (id === "GP-01") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "get_current_month_analytics", args: {} }],
    };
  }
  if (id === "RF-01") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "refuse", args: { class: "unsupported_capability" } }],
    };
  }
  if (id === "RF-05") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "refuse", args: { class: "write_forbidden" } }],
    };
  }
  if (id === "RF-06") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "refuse", args: { class: "injection" } }],
    };
  }
  return { type: "unavailable" as const };
}

describe("foundation eval harness", () => {
  it("runs the E01 golden cases against Null/Mock adapters", async () => {
    const context = workspaceContext();

    for (const evalCase of FOUNDATION_EVAL_CASES) {
      const result = await askWorkspaceQuestion(
        { question: evalCase.question, surface: "dashboard", context },
        {
          adapter:
            evalCase.expectedOutcome === "unavailable"
              ? createNullAiProviderAdapter()
              : createMockAiProviderAdapter({ script: scriptForCase(evalCase.id) }),
          registry: createFoundationToolRegistry(stubCurrentMonthAnalytics()),
          members: owningMembers(context),
          createCorrelationId: () => `eval-${evalCase.id}`,
          log: () => undefined,
        },
      );

      if (evalCase.expectedTool) {
        expect(result.outcome, evalCase.id).toBe("success");
        expect(result.selectedTools, evalCase.id).toEqual([evalCase.expectedTool]);
      }

      if (evalCase.expectedRefusal) {
        expect(result.outcome, evalCase.id).toBe("refusal");
        expect(result.refusalClass, evalCase.id).toBe(evalCase.expectedRefusal);
      }

      if (evalCase.expectedOutcome) {
        expect(result.outcome, evalCase.id).toBe(evalCase.expectedOutcome);
      }
    }
  });
});
