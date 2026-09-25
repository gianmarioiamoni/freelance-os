// src/app/(app)/reports/export/route.ts
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { ReportingService } from "@/application/reporting/reporting-service";
import {
  createReportCsvResponse,
  reportCsvFilename,
  serializeReportCsv,
} from "@/features/reporting/report-csv";
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
  const reportingService = new ReportingService(
    new AnalyticsService(repositories.analytics, repositories.members),
  );
  const now = new Date();

  try {
    const [hoursByClient, contractReport] = await Promise.all([
      reportingService.getHoursByClient(context, periodKind, now, entityFilter),
      reportingService.getContractReport(context, periodKind, now, entityFilter),
    ]);

    return createReportCsvResponse(
      serializeReportCsv({ hoursByClient, contractReport }),
      reportCsvFilename(contractReport),
    );
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Failed to export report CSV:", error);
    return new Response("Unable to export report", { status: 500 });
  }
}

function optionalSearchParam(url: URL, name: string): string | undefined {
  return url.searchParams.get(name) ?? undefined;
}
