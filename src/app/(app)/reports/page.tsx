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
import { AnnualOverviewTable } from "@/features/reporting/AnnualOverviewTable";
import { ContractReportTable } from "@/features/reporting/ContractReportTable";
import { HoursByClientTable } from "@/features/reporting/HoursByClientTable";
import { MonthlyTimesheetTable } from "@/features/reporting/MonthlyTimesheetTable";
import { PeriodSelector } from "@/features/reporting/PeriodSelector";
import { ReportAssistantLink } from "@/features/reporting/ReportAssistantLink";
import { ReportCsvExportLink } from "@/features/reporting/ReportCsvExportLink";
import { ReportExcelExportButton } from "@/features/reporting/ReportExcelExportButton";
import { ReportPdfExportButton } from "@/features/reporting/ReportPdfExportButton";
import { ReportEntityFilters } from "@/features/reporting/ReportEntityFilters";
import { toReportFilterOptions } from "@/features/reporting/report-filter-options";
import { RevenueSummary } from "@/features/reporting/RevenueSummary";
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

    return (
      <div className="grid gap-8 p-4 md:p-6 lg:p-8">
        <header className="grid gap-1">
          <h1>Reports</h1>
          <p className="text-muted-foreground">
            {showMonthlyTimesheet ? "Monthly Timesheet" : "Operational reporting"} - {periodLabel}
          </p>
          <nav
            aria-label="Report exports"
            className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-self-start"
          >
            <ReportCsvExportLink period={periodParam} filter={entityFilter} />
            <ReportExcelExportButton period={periodParam} filter={entityFilter} />
            <ReportPdfExportButton period={periodParam} filter={entityFilter} />
          </nav>
        </header>

        <ReportAssistantLink />

        <PeriodSelector current={periodParam} filter={entityFilter} />
        <ReportEntityFilters
          period={periodParam}
          filter={entityFilter}
          clients={filterOptions.clients}
          contracts={filterOptions.contracts}
        />

        {showMonthlyTimesheet ? (
          <MonthlyTimesheetSection
            context={context}
            reportingService={reportingService}
            repositories={repositories}
            entityFilter={entityFilter}
            now={now}
          />
        ) : entityFilter.clientId ? (
          <EmptyState
            title="Monthly Timesheet"
            description="To view your monthly timesheet, select the 'This Month' period."
            action={
              <Button asChild>
                <Link href={`/reports?period=month&clientId=${entityFilter.clientId}`}>
                  View Monthly Timesheet
                </Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="Monthly Timesheet"
            description="Select a client and set the period to 'This Month' to view your monthly timesheet."
          />
        )}

        <SecondaryAnalytics
          context={context}
          reportingService={reportingService}
          periodKind={periodKind}
          entityFilter={entityFilter}
          currentYear={currentYear}
          now={now}
        />
      </div>
    );
  } catch (error) {
    console.error("Failed to load reporting data:", error);
    return (
      <div className="grid gap-8 p-4 md:p-6 lg:p-8">
        <header className="grid gap-1">
          <h1>Reports</h1>
        </header>
        <ReportAssistantLink />
        <PeriodSelector current={periodParam} filter={entityFilter} />
        <ErrorState
          title="Unable to load report"
          message="An error occurred while loading your reporting data. Please try refreshing the page."
        />
      </div>
    );
  }
}

async function MonthlyTimesheetSection({
  context,
  reportingService,
  repositories,
  entityFilter,
  now,
}: {
  context: Awaited<ReturnType<typeof getCurrentWorkspaceContext>>;
  reportingService: ReportingService;
  repositories: ReturnType<typeof createRepositories>;
  entityFilter: { clientId?: string; contractId?: string };
  now: Date;
}): Promise<JSX.Element> {
  if (!entityFilter.clientId) {
    return (
      <EmptyState
        title="Select a client"
        description="Choose a client to view your monthly timesheet."
      />
    );
  }

  const report = await reportingService.getMonthlyTimesheet(
    context,
    { kind: "month" },
    entityFilter.clientId,
    repositories.clients,
    repositories.timeEntries,
    now,
  );

  return (
    <section aria-labelledby="monthly-timesheet-heading">
      <h2 id="monthly-timesheet-heading" className="sr-only">
        Monthly Timesheet
      </h2>
      <MonthlyTimesheetTable report={report} />
    </section>
  );
}

async function SecondaryAnalytics({
  context,
  reportingService,
  periodKind,
  entityFilter,
  currentYear,
  now,
}: {
  context: Awaited<ReturnType<typeof getCurrentWorkspaceContext>>;
  reportingService: ReportingService;
  periodKind: ReturnType<typeof toReportingPeriodKind>;
  entityFilter: { clientId?: string; contractId?: string };
  currentYear: number;
  now: Date;
}): Promise<JSX.Element> {
  const [hoursByClient, contractReport, revenueOverview, annualOverview] =
    await Promise.all([
      reportingService.getHoursByClient(context, periodKind, now, entityFilter),
      reportingService.getContractReport(context, periodKind, now, entityFilter),
      reportingService.getRevenueOverview(context, periodKind, now),
      reportingService.getAnnualOverview(context, currentYear, now),
    ]);

  return (
    <>
      <section aria-labelledby="revenue-heading">
        <h2 id="revenue-heading" className="text-base font-semibold">
          Revenue
        </h2>
        <RevenueSummary
          accrued={revenueOverview.accrued}
          expected={revenueOverview.expected}
          forecast={revenueOverview.forecast}
          invoiced={revenueOverview.invoiced}
          paid={revenueOverview.paid}
          outstanding={revenueOverview.outstanding}
        />
      </section>

      <section aria-labelledby="hours-by-client-heading">
        <h2 id="hours-by-client-heading" className="sr-only">
          Hours by Client
        </h2>
        <HoursByClientTable
          clientAllocations={hoursByClient.clientAllocations}
        />
      </section>

      <section aria-labelledby="contract-report-heading">
        <h2 id="contract-report-heading" className="sr-only">
          Contract Report
        </h2>
        <ContractReportTable
          contractUtilizations={contractReport.contractUtilizations}
          contractAllocations={contractReport.contractAllocations}
        />
      </section>

      <section aria-labelledby="annual-overview-heading">
        <h2 id="annual-overview-heading" className="sr-only">
          Annual Overview
        </h2>
        <AnnualOverviewTable months={annualOverview.months} year={currentYear} />
      </section>
    </>
  );
}
