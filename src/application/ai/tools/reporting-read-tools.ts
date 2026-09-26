// src/application/ai/tools/reporting-read-tools.ts
import { AiClarificationError } from "@/application/ai/ai-errors";
import type { AiAnalyticsServices } from "@/application/ai/ai-service-ports";
import type { AiReadTool } from "@/application/ai/tool-contract";
import {
  minimizeAnnualOverview,
  minimizeContractReport,
  minimizeHoursByClient,
} from "@/application/ai/grounding/minimize-dtos";
import { parseOptionalYear } from "@/application/ai/parse-tool-args";
import { parseAiPeriodRequest } from "@/application/ai/resolve-ai-period";
import { resolveAnalyticsFilter } from "@/application/ai/resolve-ai-entity";
import { getTodayInTimezone } from "@/lib/analytics-periods";

const PERIOD_FILTER_KEYS = [
  "periodKind",
  "startDate",
  "endDate",
  "clientId",
  "clientName",
  "contractId",
] as const;

export function createGetHoursByClientTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "get_hours_by_client",
    description: "Hours distributed by client for a supported reporting period.",
    readOnly: true,
    argumentKeys: PERIOD_FILTER_KEYS,
    async execute(context, args) {
      const request = parseAiPeriodRequest(args);
      const filter = await resolveAnalyticsFilter(context, args, services);
      return minimizeHoursByClient(
        await services.getHoursByClient(context, request, undefined, filter),
      );
    },
  };
}

export function createGetContractReportTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "get_contract_report",
    description: "Contract utilization, allocation, Accrued, Expected, and Forecast for a period.",
    readOnly: true,
    argumentKeys: PERIOD_FILTER_KEYS,
    async execute(context, args) {
      const request = parseAiPeriodRequest(args);
      const filter = await resolveAnalyticsFilter(context, args, services);
      return minimizeContractReport(
        await services.getContractReport(context, request, undefined, filter),
      );
    },
  };
}

export function createGetAnnualOverviewTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "get_annual_overview",
    description: "Unfiltered annual overview of monthly analytics buckets.",
    readOnly: true,
    argumentKeys: ["year"],
    async execute(context, args) {
      const year = parseOptionalYear(args.year) ?? getTodayInTimezone(context.timezone).year;
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new AiClarificationError("invalid_period");
      }
      return minimizeAnnualOverview(await services.getAnnualOverview(context, year));
    },
  };
}
