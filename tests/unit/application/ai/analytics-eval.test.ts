// tests/unit/application/ai/analytics-eval.test.ts
import { describe, expect, it } from "vitest";

import { createAnalyticsToolRegistry } from "@/application/ai/create-analytics-registry";
import { ANALYTICS_EVAL_CASES } from "@/application/ai/eval/analytics-eval-cases";
import { askWorkspaceQuestion } from "@/application/ai/orchestrator";
import { createMockAiProviderAdapter } from "@/infrastructure/ai/mock-ai-provider-adapter";
import { createNullAiProviderAdapter } from "@/infrastructure/ai/null-ai-provider-adapter";

import {
  clientRecord,
  owningMembers,
  stubAnalyticsServices,
  workspaceContext,
} from "./ai-test-helpers";

function scriptForCase(id: string) {
  if (id === "GP-01" || id === "GP-02" || id === "GP-06") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "get_current_month_analytics", args: {} }],
    };
  }
  if (id === "GP-03") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "get_accrued_revenue", args: { periodKind: "month" } }],
    };
  }
  if (id === "GP-04") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "get_expected_revenue", args: { periodKind: "month" } }],
    };
  }
  if (id === "GP-05") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "get_forecast_revenue", args: { periodKind: "month" } }],
    };
  }
  if (id === "GP-07") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "get_hours_by_client", args: { periodKind: "month" } }],
    };
  }
  if (id === "GP-08") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "get_contract_report", args: { periodKind: "month" } }],
    };
  }
  if (id === "GP-09") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "list_contract_allocations", args: {} }],
    };
  }
  if (id === "RF-07") {
    return {
      type: "tool_calls" as const,
      calls: [{ name: "get_accrued_revenue", args: { periodKind: "month", clientName: "ACME" } }],
    };
  }
  if (id === "RF-08") {
    return {
      type: "tool_calls" as const,
      calls: [
        {
          name: "get_forecast_revenue",
          args: { periodKind: "custom", startDate: "2025-01-01", endDate: "2025-01-31" },
        },
      ],
    };
  }
  if (id.startsWith("RF-") && id !== "RF-09") {
    const refusal =
      id === "RF-05" ? "write_forbidden" : id === "RF-06" ? "injection" : "unsupported_capability";
    return {
      type: "message" as const,
      message: JSON.stringify({ refusal }),
    };
  }
  return { type: "unavailable" as const };
}

describe("analytics eval harness", () => {
  it("evaluates GP and RF cases against scripted Mock/Null adapters, not a live model", async () => {
    const context = workspaceContext();
    const captured: {
      context?: ReturnType<typeof workspaceContext>;
      periodKind?: string;
    } = {};
    const defaults = stubAnalyticsServices({}, captured);
    const services = stubAnalyticsServices(
      {
        resolvePeriod: (request, timezone, now) => {
          captured.periodKind = request.kind;
          return defaults.resolvePeriod(request, timezone, now);
        },
        listClients: async () => [
          clientRecord(),
          clientRecord({ id: "client-a", companyName: "ACME" }),
          clientRecord({ id: "client-b", companyName: "ACME" }),
        ],
        getForecastRevenue: async (_context, period) => {
          if (period.startDate.getUTCFullYear() === 2025) {
            return null;
          }
          return {
            period,
            timezone: "Europe/Rome",
            elapsedPeriod: 26,
            totalPeriod: 26,
            byCurrency: [{ currency: "EUR", unrounded: 160, published: 160 }],
            byContract: [],
          };
        },
      },
      captured,
    );

    for (const evalCase of ANALYTICS_EVAL_CASES) {
      const result = await askWorkspaceQuestion(
        { question: evalCase.question, surface: "dashboard", context },
        {
          adapter:
            evalCase.expectedOutcome === "unavailable"
              ? createNullAiProviderAdapter()
              : createMockAiProviderAdapter({ script: scriptForCase(evalCase.id) }),
          registry: createAnalyticsToolRegistry(services),
          members: owningMembers(context),
          createCorrelationId: () => `eval-${evalCase.id}`,
          log: () => undefined,
        },
      );

      if (evalCase.expectedTool) {
        expect(result.outcome, evalCase.id).toBe("success");
        expect(result.selectedTools, evalCase.id).toEqual([evalCase.expectedTool]);
        expect(result.citations.length, evalCase.id).toBeGreaterThan(0);
        expect(result.citations.every((citation) => citation.tool === evalCase.expectedTool)).toBe(true);
        expect(JSON.stringify(result), evalCase.id).not.toContain("workspace-owned");
        expect(JSON.stringify(result), evalCase.id).not.toContain("contract-1");
        expect(captured.context?.workspaceId, evalCase.id).toBe(context.workspaceId);
        if (
          evalCase.expectedPeriodKind &&
          evalCase.expectedTool !== "get_current_month_analytics" &&
          evalCase.expectedTool !== "list_contract_allocations"
        ) {
          expect(captured.periodKind, evalCase.id).toBe(evalCase.expectedPeriodKind);
        }
      }

      if (evalCase.id === "GP-08") {
        expect(result.facts.some((item) => item.metric === "utilizationPercentage")).toBe(true);
        expect(result.facts.some((item) => item.metric === "allocationStatus")).toBe(true);
        expect(result.citations.some((citation) => citation.contractLabel === "ACME")).toBe(true);
      }

      if (evalCase.id === "GP-09") {
        expect(result.facts.some((item) => item.metric === "allocationStatus" && item.value === "WARNING")).toBe(true);
        expect(result.citations.some((citation) => citation.contractLabel === "ACME")).toBe(true);
      }

      if (evalCase.id === "RF-08") {
        expect(result.citations.some((citation) => citation.metric === "forecast" && citation.value === null)).toBe(true);
        expect(result.text).not.toMatch(/\d{4,} EUR/);
      }

      if (evalCase.expectedRefusal && evalCase.expectedOutcome === "clarification") {
        expect(result.outcome, evalCase.id).toBe("clarification");
        expect(result.refusalClass, evalCase.id).toBe(evalCase.expectedRefusal);
      } else if (evalCase.expectedRefusal && !evalCase.expectedTool) {
        expect(result.outcome, evalCase.id).toBe("refusal");
        expect(result.refusalClass, evalCase.id).toBe(evalCase.expectedRefusal);
      }

      if (evalCase.expectedOutcome === "unavailable") {
        expect(result.outcome, evalCase.id).toBe("unavailable");
      }
    }
  });
});
