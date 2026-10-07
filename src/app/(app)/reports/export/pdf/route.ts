// src/app/(app)/reports/export/pdf/route.ts
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { WorkspaceInvoiceService } from "@/application/invoices/workspace-invoice-service";
import { ReportingService } from "@/application/reporting/reporting-service";
import {
  createReportPdfResponse,
  reportPdfFilename,
  serializeReportPdf,
} from "@/features/reporting/report-pdf";
import { serializeMonthlyTimesheetPdf } from "@/features/reporting/monthly-timesheet-pdf";
import { monthlyTimesheetFilename } from "@/features/reporting/monthly-timesheet-export";
import {
  parseReportEntityFilterParam,
  parseReportPeriodParam,
  toReportingPeriodKind,
} from "@/features/reporting/reporting-types";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { isNextRedirectError } from "@/lib/next-redirect-error";

export async function GET(request: Request): Promise<Response> {
  const context = await getCurrentWorkspaceContext();
  const url = new URL(request.url);
  const params = {
    period: optionalSearchParam(url, "period"),
    start: optionalSearchParam(url, "start"),
    end: optionalSearchParam(url, "end"),
    clientId: optionalSearchParam(url, "clientId"),
    contractId: optionalSearchParam(url, "contractId"),
  };
  const periodParam = parseReportPeriodParam(params);
  const periodKind = toReportingPeriodKind(periodParam);
  const entityFilter = parseReportEntityFilterParam(params);

  const repositories = createRepositories();
  const analyticsService = new AnalyticsService(
    repositories.analytics,
    repositories.members,
  );
  const invoiceService = new WorkspaceInvoiceService(
    repositories.invoices,
    repositories.payments,
    repositories.clients,
    repositories.contracts,
  );
  const reportingService = new ReportingService(analyticsService, invoiceService);
  const now = new Date();

  try {
    // Monthly Timesheet export when month + clientId selected
    if (periodParam.kind === "month" && entityFilter.clientId) {
      const timesheet = await reportingService.getMonthlyTimesheet(
        context,
        periodKind,
        entityFilter.clientId,
        repositories.clients,
        repositories.timeEntries,
        now,
      );

      const buffer = await serializeMonthlyTimesheetPdf(timesheet);
      const filename = monthlyTimesheetFilename(timesheet, "pdf");

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Legacy report PDF for other periods/filters
    const [hoursByClient, contractReport, revenueOverview] = await Promise.all([
      reportingService.getHoursByClient(context, periodKind, now, entityFilter),
      reportingService.getContractReport(context, periodKind, now, entityFilter),
      reportingService.getRevenueOverview(context, periodKind, now),
    ]);

    const buffer = await serializeReportPdf({
      hoursByClient,
      contractReport,
      revenueOverview,
    });

    return createReportPdfResponse(buffer, reportPdfFilename(contractReport));
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Failed to export report PDF:", error);
    return new Response("Unable to export report", { status: 500 });
  }
}

function optionalSearchParam(url: URL, name: string): string | undefined {
  return url.searchParams.get(name) ?? undefined;
}
