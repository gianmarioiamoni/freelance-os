// src/application/ai/tools/get-current-month-analytics-tool.ts
import type { AiReadTool } from "@/application/ai/tool-contract";
import { AI_TOOL_ROW_CAP } from "@/application/ai/ai-types";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { MonthlyAnalytics } from "@/domain/analytics-types";

export type CurrentMonthAnalyticsReader = {
  getCurrentMonthAnalytics(context: WorkspaceContext): Promise<MonthlyAnalytics>;
};

/**
 * E01 representative tool. Smallest existing deterministic read:
 * no model-visible args, already membership-checked in AnalyticsService.
 * Full E02 catalog is not implemented here.
 */
export function createGetCurrentMonthAnalyticsTool(
  analytics: CurrentMonthAnalyticsReader,
): AiReadTool<MonthlyAnalytics> {
  return {
    name: "get_current_month_analytics",
    description:
      "Current-month hours, Accrued, Expected, Forecast, client allocations, and contract utilizations.",
    readOnly: true,
    argumentKeys: [],
    async execute(context) {
      const result = await analytics.getCurrentMonthAnalytics(context);
      return {
        ...result,
        clientAllocations: result.clientAllocations.slice(0, AI_TOOL_ROW_CAP),
        contractUtilizations: result.contractUtilizations.slice(0, AI_TOOL_ROW_CAP),
      };
    },
  };
}
