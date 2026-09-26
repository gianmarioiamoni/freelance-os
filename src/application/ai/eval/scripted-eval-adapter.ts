// src/application/ai/eval/scripted-eval-adapter.ts
import type { MockAiScript } from "@/infrastructure/ai/mock-ai-provider-adapter";

/**
 * Canonical GP/RF scripts. These are fixtures, not a live model.
 * Do not change a case to make a candidate look better.
 */
export function scriptForAnalyticsEvalCase(id: string): MockAiScript {
  if (id === "GP-01" || id === "GP-02" || id === "GP-06") {
    return { type: "tool_calls", calls: [{ name: "get_current_month_analytics", args: {} }] };
  }
  if (id === "GP-03") {
    return {
      type: "tool_calls",
      calls: [{ name: "get_accrued_revenue", args: { periodKind: "month" } }],
    };
  }
  if (id === "GP-04") {
    return {
      type: "tool_calls",
      calls: [{ name: "get_expected_revenue", args: { periodKind: "month" } }],
    };
  }
  if (id === "GP-05") {
    return {
      type: "tool_calls",
      calls: [{ name: "get_forecast_revenue", args: { periodKind: "month" } }],
    };
  }
  if (id === "GP-07") {
    return {
      type: "tool_calls",
      calls: [{ name: "get_hours_by_client", args: { periodKind: "month" } }],
    };
  }
  if (id === "GP-08") {
    return {
      type: "tool_calls",
      calls: [{ name: "get_contract_report", args: { periodKind: "month" } }],
    };
  }
  if (id === "GP-09") {
    return { type: "tool_calls", calls: [{ name: "list_contract_allocations", args: {} }] };
  }
  if (id === "RF-07") {
    return {
      type: "tool_calls",
      calls: [{ name: "get_accrued_revenue", args: { periodKind: "month", clientName: "ACME" } }],
    };
  }
  if (id === "RF-08") {
    return {
      type: "tool_calls",
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
    return { type: "message", message: JSON.stringify({ refusal }) };
  }
  return { type: "unavailable" };
}

export function scriptForBoundaryEvalCase(id: string): MockAiScript {
  if (id === "SEC-TENANT") {
    return {
      type: "tool_calls",
      calls: [
        {
          name: "get_accrued_revenue",
          args: { periodKind: "month", workspaceId: "workspace-foreign", userId: "other", role: "OWNER" },
        },
      ],
    };
  }
  if (id === "SEC-FAKE-TOOL") {
    return { type: "tool_calls", calls: [{ name: "execute_sql", args: {} }] };
  }
  if (id === "SEC-MULTI") {
    return {
      type: "tool_calls",
      calls: [
        { name: "get_accrued_revenue", args: {} },
        { name: "get_expected_revenue", args: {} },
      ],
    };
  }
  if (id === "SEC-PROSE") {
    return { type: "message", message: "Hai maturato 99999 EUR. Citation: invented." };
  }
  if (id === "SEC-MALFORMED") {
    return { type: "message", message: "{" };
  }
  if (id === "SEC-TIMEOUT") {
    return { type: "timeout" };
  }
  if (id === "SEC-ERROR") {
    return { type: "error", code: "5xx" };
  }
  if (id === "SEC-WRITE-NAME") {
    return { type: "tool_calls", calls: [{ name: "create_time_entry", args: { hours: 3 } }] };
  }
  return { type: "unavailable" };
}