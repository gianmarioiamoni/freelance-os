"use client";

import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnnualInvoiceReport } from "@/features/reporting/AnnualInvoiceReport";
import { AnnualOverviewTable } from "@/features/reporting/AnnualOverviewTable";
import { ContractReportTable } from "@/features/reporting/ContractReportTable";
import { HoursByClientTable } from "@/features/reporting/HoursByClientTable";
import { MonthlyTimesheetTable } from "@/features/reporting/MonthlyTimesheetTable";
import { PeriodSelector } from "@/features/reporting/PeriodSelector";
import { ReportCsvExportLink } from "@/features/reporting/ReportCsvExportLink";
import { ReportExcelExportButton } from "@/features/reporting/ReportExcelExportButton";
import { ReportPdfExportButton } from "@/features/reporting/ReportPdfExportButton";
import { ReportEntityFilters } from "@/features/reporting/ReportEntityFilters";
import { RevenueSummary } from "@/features/reporting/RevenueSummary";
import type { MonthlyTimesheetReport } from "@/application/reporting/reporting-service";
import type {
  ReportPeriodParam,
  ReportEntityFilterParam,
} from "@/features/reporting/reporting-types";
import Link from "next/link";
import type { JSX } from "react";
import { useState } from "react";

type ReportsPageClientProps = {
  periodParam: ReportPeriodParam;
  periodLabel: string;
  entityFilter: ReportEntityFilterParam;
  filterOptions: {
    clients: Array<{ id: string; label: string }>;
    contracts: Array<{ id: string; label: string }>;
  };
  monthlyTimesheetReport: MonthlyTimesheetReport | null;
  hoursByClient: Awaited<ReturnType<import("@/application/reporting/reporting-service").ReportingService["getHoursByClient"]>>;
  contractReport: Awaited<ReturnType<import("@/application/reporting/reporting-service").ReportingService["getContractReport"]>>;
  revenueOverview: Awaited<ReturnType<import("@/application/reporting/reporting-service").ReportingService["getRevenueOverview"]>>;
  annualOverview: Awaited<ReturnType<import("@/application/reporting/reporting-service").ReportingService["getAnnualOverview"]>>;
  currentYear: number;
};

type TabValue = "operational" | "monthly-timesheet" | "annual-overview";

export function ReportsPageClient({
  periodParam,
  periodLabel,
  entityFilter,
  filterOptions,
  monthlyTimesheetReport,
  hoursByClient,
  contractReport,
  revenueOverview,
  annualOverview,
  currentYear,
}: ReportsPageClientProps): JSX.Element {
  const showMonthlyTimesheet = entityFilter.clientId && periodParam.kind === "month";
  const defaultTab: TabValue = showMonthlyTimesheet ? "monthly-timesheet" : "operational";
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);

  function getExportLabel(): string {
    switch (activeTab) {
      case "monthly-timesheet":
        return "Exporting: Monthly Timesheet";
      case "annual-overview":
        return "Exporting: Annual Overview";
      case "operational":
      default:
        return "Exporting: Operational Reports";
    }
  }

  const canExportMonthly = activeTab === "monthly-timesheet" && monthlyTimesheetReport !== null;
  const canExportOperational = activeTab === "operational";

  return (
    <div className="grid gap-8 p-4 md:p-6 lg:p-8">
      <header className="grid gap-1">
        <h1>Reports</h1>
        <p className="text-muted-foreground">{periodLabel}</p>
      </header>

      <section aria-label="Export options" className="grid gap-2">
        <p className="text-xs text-muted-foreground font-medium">{getExportLabel()}</p>
        <nav
          aria-label="Report exports"
          className="flex flex-wrap items-center gap-x-4 gap-y-1"
        >
          {activeTab === "monthly-timesheet" && (
            <>
              <ReportCsvExportLink
                period={periodParam}
                filter={entityFilter}
                disabled={!canExportMonthly}
              />
              <ReportExcelExportButton
                period={periodParam}
                filter={entityFilter}
                disabled={!canExportMonthly}
              />
              <ReportPdfExportButton
                period={periodParam}
                filter={entityFilter}
                disabled={!canExportMonthly}
              />
            </>
          )}
          {activeTab === "operational" && (
            <>
              <ReportCsvExportLink
                period={periodParam}
                filter={entityFilter}
                disabled={!canExportOperational}
              />
              <ReportExcelExportButton
                period={periodParam}
                filter={entityFilter}
                disabled={!canExportOperational}
              />
              <ReportPdfExportButton
                period={periodParam}
                filter={entityFilter}
                disabled={!canExportOperational}
              />
            </>
          )}
          {activeTab === "annual-overview" && (
            <p className="text-sm text-muted-foreground">
              Annual export available within the Annual Invoice Report section
            </p>
          )}
        </nav>
      </section>

      <PeriodSelector current={periodParam} filter={entityFilter} />
      <ReportEntityFilters
        period={periodParam}
        filter={entityFilter}
        clients={filterOptions.clients}
        contracts={filterOptions.contracts}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="operational">Operational Reports</TabsTrigger>
          <TabsTrigger value="monthly-timesheet">Monthly Timesheet</TabsTrigger>
          <TabsTrigger value="annual-overview">Annual Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="operational">
          <div className="grid gap-8">
            <section aria-labelledby="revenue-heading">
              <h2 id="revenue-heading" className="text-base font-semibold mb-4">
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
          </div>
        </TabsContent>

        <TabsContent value="monthly-timesheet">
          {showMonthlyTimesheet && monthlyTimesheetReport ? (
            <section aria-labelledby="monthly-timesheet-heading">
              <h2 id="monthly-timesheet-heading" className="sr-only">
                Monthly Timesheet
              </h2>
              <MonthlyTimesheetTable report={monthlyTimesheetReport} />
            </section>
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
        </TabsContent>

        <TabsContent value="annual-overview">
          <div className="grid gap-8">
            <AnnualInvoiceReport initialYear={currentYear} />

            <section aria-labelledby="annual-overview-heading">
              <h2 id="annual-overview-heading" className="sr-only">
                Annual Overview
              </h2>
              <AnnualOverviewTable months={annualOverview.months} year={currentYear} />
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
