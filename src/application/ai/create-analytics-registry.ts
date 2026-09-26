// src/application/ai/create-analytics-registry.ts
import type { AiAnalyticsServices } from "@/application/ai/ai-service-ports";
import { createAiToolRegistry, type AiToolRegistry } from "@/application/ai/tool-registry";
import {
  createGetAccruedRevenueTool,
  createGetExpectedRevenueTool,
  createGetForecastRevenueTool,
  createGetMonthlyAnalyticsTool,
} from "@/application/ai/tools/analytics-read-tools";
import {
  createGetContractAllocationTool,
  createListContractAllocationsTool,
} from "@/application/ai/tools/allocation-read-tools";
import {
  createGetClientTool,
  createGetContractTool,
  createListClientsTool,
  createListContractsTool,
} from "@/application/ai/tools/entity-read-tools";
import { createGetCurrentMonthAnalyticsTool } from "@/application/ai/tools/get-current-month-analytics-tool";
import { createGetNotificationsTool } from "@/application/ai/tools/get-notifications-tool";
import {
  createGetInvoiceTool,
  createGetPaymentTool,
  createListInvoicesForContractTool,
  createListPaymentsForInvoiceTool,
} from "@/application/ai/tools/invoice-payment-read-tools";
import {
  createGetAnnualOverviewTool,
  createGetContractReportTool,
  createGetHoursByClientTool,
} from "@/application/ai/tools/reporting-read-tools";

export function createAnalyticsToolRegistry(
  services: AiAnalyticsServices,
): AiToolRegistry {
  return createAiToolRegistry([
    createGetCurrentMonthAnalyticsTool(services),
    createGetMonthlyAnalyticsTool(services),
    createGetAccruedRevenueTool(services),
    createGetExpectedRevenueTool(services),
    createGetForecastRevenueTool(services),
    createGetHoursByClientTool(services),
    createGetContractReportTool(services),
    createListContractAllocationsTool(services),
    createGetContractAllocationTool(services),
    createGetAnnualOverviewTool(services),
    createListClientsTool(services),
    createGetClientTool(services),
    createListContractsTool(services),
    createGetContractTool(services),
    createListInvoicesForContractTool(services),
    createGetInvoiceTool(services),
    createListPaymentsForInvoiceTool(services),
    createGetPaymentTool(services),
    createGetNotificationsTool(services),
  ]);
}
