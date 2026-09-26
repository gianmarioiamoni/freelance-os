// src/application/ai/tools/analytics-read-tools.ts
import type { AiAnalyticsServices } from "@/application/ai/ai-service-ports";
import type { AiReadTool } from "@/application/ai/tool-contract";
import { minimizeMonthlyAnalytics, minimizeRevenue } from "@/application/ai/grounding/minimize-dtos";
import { resolveAiPeriod } from "@/application/ai/resolve-ai-period";
import { resolveAnalyticsFilter } from "@/application/ai/resolve-ai-entity";

const PERIOD_KEYS = ["periodKind", "startDate", "endDate"] as const;
const PERIOD_FILTER_KEYS = [...PERIOD_KEYS, "clientId", "clientName", "contractId"] as const;

async function resolvePeriodAndFilter(
  context: Parameters<AiAnalyticsServices["getAccruedRevenue"]>[0],
  args: Record<string, unknown>,
  services: AiAnalyticsServices,
) {
  const { period } = resolveAiPeriod(args, context.timezone, services.resolvePeriod);
  const filter = await resolveAnalyticsFilter(context, args, services);
  return { period, filter };
}

export function createGetMonthlyAnalyticsTool(
  services: AiAnalyticsServices,
): AiReadTool {
  return {
    name: "get_monthly_analytics",
    description:
      "Broad hours, Accrued, Expected, and Forecast overview for a supported reporting period. Not a substitute for specialized metric tools when the user asks for one specific metric.",
    readOnly: true,
    argumentKeys: PERIOD_KEYS,
    async execute(context, args) {
      const { period } = resolveAiPeriod(args, context.timezone, services.resolvePeriod);
      return minimizeMonthlyAnalytics(await services.getMonthlyAnalytics(context, period));
    },
  };
}

export function createGetAccruedRevenueTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "get_accrued_revenue",
    description:
      "Owns Accrued Revenue user-intent for a supported period. Use only when the question asks specifically for Accrued. Not an overview, entity list, or collection tool.",
    readOnly: true,
    argumentKeys: PERIOD_FILTER_KEYS,
    async execute(context, args) {
      const { period, filter } = await resolvePeriodAndFilter(context, args, services);
      return minimizeRevenue(await services.getAccruedRevenue(context, period, filter));
    },
  };
}

export function createGetExpectedRevenueTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "get_expected_revenue",
    description:
      "Owns Expected Revenue user-intent for a supported period. Nulls are preserved. Use only when the question asks specifically for Expected. Not an overview, entity list, or collection tool.",
    readOnly: true,
    argumentKeys: PERIOD_FILTER_KEYS,
    async execute(context, args) {
      const { period, filter } = await resolvePeriodAndFilter(context, args, services);
      return minimizeRevenue(await services.getExpectedRevenue(context, period, filter));
    },
  };
}

export function createGetForecastRevenueTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "get_forecast_revenue",
    description:
      "Owns Forecast Revenue user-intent for a certified current period. Null when the period is not current. Use only when the question asks specifically for Forecast. Not an overview, entity list, or collection tool.",
    readOnly: true,
    argumentKeys: PERIOD_FILTER_KEYS,
    async execute(context, args) {
      const { period, filter } = await resolvePeriodAndFilter(context, args, services);
      const result = await services.getForecastRevenue(context, period, filter);
      return result ? minimizeRevenue(result) : { period: { startDate: period.startDate.toISOString(), endDate: period.endDate.toISOString() }, byCurrency: [], unavailable: true };
    },
  };
}
