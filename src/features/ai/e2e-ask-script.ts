// src/features/ai/e2e-ask-script.ts
import type { AiAdapterRequest } from "@/application/ai/ai-provider-port";
import type { MockAiScript } from "@/infrastructure/ai/mock-ai-provider-adapter";
import { GUIDED_PROMPT_CATALOG, type GuidedPromptId } from "@/features/ai/guided-prompt-catalog";

const E2E_TOOL_BY_PROMPT: Record<GuidedPromptId, { name: string; args: Record<string, string> }> = {
  "GP-01": { name: "get_current_month_analytics", args: {} },
  "GP-02": { name: "get_current_month_analytics", args: {} },
  "GP-03": { name: "get_accrued_revenue", args: { periodKind: "month" } },
  "GP-04": { name: "get_expected_revenue", args: { periodKind: "month" } },
  "GP-05": { name: "get_forecast_revenue", args: { periodKind: "month" } },
  "GP-06": { name: "get_current_month_analytics", args: {} },
  "GP-07": { name: "get_hours_by_client", args: { periodKind: "month" } },
  "GP-08": { name: "get_contract_report", args: { periodKind: "month" } },
  "GP-09": { name: "list_contract_allocations", args: {} },
};

export function e2eAskScript(request: AiAdapterRequest): MockAiScript {
  const question = request.user.trim();
  const prompt = GUIDED_PROMPT_CATALOG.find((item) => item.text === question);
  if (!prompt) {
    return { type: "unavailable" };
  }

  return {
    type: "tool_calls",
    calls: [E2E_TOOL_BY_PROMPT[prompt.id]],
  };
}
