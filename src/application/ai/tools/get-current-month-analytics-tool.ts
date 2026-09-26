// src/application/ai/tools/get-current-month-analytics-tool.ts
import type { AiReadTool } from "@/application/ai/tool-contract";
import { minimizeMonthlyAnalytics } from "@/application/ai/grounding/minimize-dtos";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { MonthlyAnalytics } from "@/domain/analytics-types";

export type CurrentMonthAnalyticsReader = {
  getCurrentMonthAnalytics(context: WorkspaceContext): Promise<MonthlyAnalytics>;
};

export function createGetCurrentMonthAnalyticsTool(
  analytics: CurrentMonthAnalyticsReader,
): AiReadTool<ReturnType<typeof minimizeMonthlyAnalytics>> {
  return {
    name: "get_current_month_analytics",
    description:
      "Broad current-month overview combining hours, Accrued, Expected, Forecast, client allocations, and contract utilizations. Not a substitute for specialized metric tools when the user asks for one specific metric.",
    readOnly: true,
    argumentKeys: [],
    async execute(context) {
      const result = await analytics.getCurrentMonthAnalytics(context);
      return minimizeMonthlyAnalytics(result);
    },
  };
}
