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
    description: "Hours, Accrued, Expected, and Forecast for a supported reporting period.",
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
    description: "Authoritative Accrued Revenue for a supported period.",
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
    description: "Authoritative Expected Revenue for a supported period. Nulls are preserved.",
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
      "Forecast Revenue for a certified current period. Null when the period is not current.",
    readOnly: true,
    argumentKeys: PERIOD_FILTER_KEYS,
    async execute(context, args) {
      const { period, filter } = await resolvePeriodAndFilter(context, args, services);
      const result = await services.getForecastRevenue(context, period, filter);
      return result ? minimizeRevenue(result) : { period: { startDate: period.startDate.toISOString(), endDate: period.endDate.toISOString() }, byCurrency: [], unavailable: true };
    },
  };
}
