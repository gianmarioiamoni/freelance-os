// src/app/(app)/reports/page.tsx
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { listClients } from "@/application/clients/list-clients";
import { listContracts } from "@/application/contracts/list-contracts";
import { WorkspaceInvoiceService } from "@/application/invoices/workspace-invoice-service";
import { ReportingService } from "@/application/reporting/reporting-service";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { Button } from "@/components/ui/button";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { AnnualInvoiceReport } from "@/features/reporting/AnnualInvoiceReport";
import { AnnualOverviewTable } from "@/features/reporting/AnnualOverviewTable";
import { ContractReportTable } from "@/features/reporting/ContractReportTable";
import { HoursByClientTable } from "@/features/reporting/HoursByClientTable";
import { MonthlyTimesheetTable } from "@/features/reporting/MonthlyTimesheetTable";
import { PeriodSelector } from "@/features/reporting/PeriodSelector";
import { ReportEntityFilters } from "@/features/reporting/ReportEntityFilters";
import { toReportFilterOptions } from "@/features/reporting/report-filter-options";
import { RevenueSummary } from "@/features/reporting/RevenueSummary";
import { ReportsPageClient } from "@/features/reporting/ReportsPageClient";
import {
  getReportingCalendarYear,
  parseReportEntityFilterParam,
  parseReportPeriodParam,
  toReportingPeriodKind,
  PERIOD_LABELS,
} from "@/features/reporting/reporting-types";
import Link from "next/link";
import type { JSX } from "react";

type ReportsPageProps = {
  searchParams: Promise<{
    period?: string;
    start?: string;
    end?: string;
    clientId?: string;
    contractId?: string;
  }>;
};

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps): Promise<JSX.Element> {
  // Authorization and workspace resolution - outside any try block (P105-05 criterion).
  const context = await getCurrentWorkspaceContext();
  const params = await searchParams;
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
  const currentYear = getReportingCalendarYear(context.timezone, now);

  try {
    const [clients, contracts] = await Promise.all([
      listClients(context, repositories.clients),
      listContracts(context, repositories.contracts),
    ]);
    const filterOptions = toReportFilterOptions(clients, contracts);

    const periodLabel =
      periodParam.kind === "custom"
        ? `${periodParam.start} - ${periodParam.end}`
        : PERIOD_LABELS[periodParam.kind];

    const showMonthlyTimesheet = entityFilter.clientId && periodParam.kind === "month";

    // Load monthly timesheet if needed
    let monthlyTimesheetReport = null;
    if (showMonthlyTimesheet && entityFilter.clientId) {
      monthlyTimesheetReport = await reportingService.getMonthlyTimesheet(
        context,
        { kind: "month" },
        entityFilter.clientId,
        repositories.clients,
        repositories.timeEntries,
        now,
      );
    }

    // Load operational reports
    const [hoursByClient, contractReport, revenueOverview, annualOverview] =
      await Promise.all([
        reportingService.getHoursByClient(context, periodKind, now, entityFilter),
        reportingService.getContractReport(context, periodKind, now, entityFilter),
        reportingService.getRevenueOverview(context, periodKind, now),
        reportingService.getAnnualOverview(context, currentYear, now),
      ]);

    return (
      <ReportsPageClient
        periodParam={periodParam}
        periodLabel={periodLabel}
        entityFilter={entityFilter}
        filterOptions={filterOptions}
        monthlyTimesheetReport={monthlyTimesheetReport}
        hoursByClient={hoursByClient}
        contractReport={contractReport}
        revenueOverview={revenueOverview}
        annualOverview={annualOverview}
        currentYear={currentYear}
      />
    );
  } catch (error) {
    console.error("Failed to load reporting data:", error);
    return (
      <div className="grid gap-8 p-4 md:p-6 lg:p-8">
        <header className="grid gap-1">
          <h1>Reports</h1>
        </header>
        <PeriodSelector current={periodParam} filter={entityFilter} />
        <ErrorState
          title="Unable to load report"
          message="An error occurred while loading your reporting data. Please try refreshing the page."
        />
      </div>
    );
  }
}
