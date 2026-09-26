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
    description:
      "Owns hours-by-client user-intent for a supported reporting period. Returns hours grouped by client. Not a workspace overview and not a client entity list.",
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
    description:
      "Owns contract utilization and allocation-attention user-intent for a period. Returns utilization, allocation, Accrued, Expected, and Forecast. Semantic discriminator: analytics report, not a commercial contract entity list. Not a substitute for list_contracts.",
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
    description:
      "Unfiltered annual overview of monthly analytics buckets. Not a substitute for specialized metric tools or get_contract_report.",
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
