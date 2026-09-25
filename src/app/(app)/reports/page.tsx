// src/app/(app)/reports/page.tsx
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { listClients } from "@/application/clients/list-clients";
import { listContracts } from "@/application/contracts/list-contracts";
import { ReportingService } from "@/application/reporting/reporting-service";
import { ErrorState } from "@/components/states/ErrorState";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { AnnualOverviewTable } from "@/features/reporting/AnnualOverviewTable";
import { ContractReportTable } from "@/features/reporting/ContractReportTable";
import { HoursByClientTable } from "@/features/reporting/HoursByClientTable";
import { PeriodSelector } from "@/features/reporting/PeriodSelector";
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
  // Authorization and workspace resolution — outside any try block (P105-05 criterion).
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
  const reportingService = new ReportingService(analyticsService);

  const now = new Date();
  const currentYear = getReportingCalendarYear(context.timezone, now);

  try {
    const [hoursByClient, contractReport, annualOverview, clients, contracts] =
      await Promise.all([
        reportingService.getHoursByClient(context, periodKind, now, entityFilter),
        reportingService.getContractReport(context, periodKind, now, entityFilter),
        reportingService.getAnnualOverview(context, currentYear, now),
        listClients(context, repositories.clients),
        listContracts(context, repositories.contracts),
      ]);
    const filterOptions = toReportFilterOptions(clients, contracts);

    const periodLabel =
      periodParam.kind === "custom"
        ? `${periodParam.start} — ${periodParam.end}`
        : PERIOD_LABELS[periodParam.kind];

    return (
      <div className="grid gap-8 p-4 md:p-6 lg:p-8">
        <header className="grid gap-1">
          <h1>Reports</h1>
          <p className="text-muted-foreground">
            Operational reporting — {periodLabel}
          </p>
        </header>

        <PeriodSelector current={periodParam} filter={entityFilter} />
        <ReportEntityFilters
          period={periodParam}
          filter={entityFilter}
          clients={filterOptions.clients}
          contracts={filterOptions.contracts}
        />

        <section aria-labelledby="revenue-heading">
          <h2 id="revenue-heading" className="text-base font-semibold">
            Revenue
          </h2>
          <RevenueSummary
            accrued={contractReport.accrued}
            expected={contractReport.expected}
            forecast={contractReport.forecast}
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
          <AnnualOverviewTable
            months={annualOverview.months}
            year={currentYear}
          />
        </section>
      </div>
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
