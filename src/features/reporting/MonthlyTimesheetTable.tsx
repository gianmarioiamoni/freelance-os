"use client";

import type { MonthlyTimesheetReport } from "@/application/reporting/reporting-service";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { formatPublishedAmounts } from "@/features/reporting/revenue-display";
import Link from "next/link";
import type { JSX } from "react";

function formatItalianDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

type MonthlyTimesheetTableProps = {
  report: MonthlyTimesheetReport;
};

export function MonthlyTimesheetTable({
  report,
}: MonthlyTimesheetTableProps): JSX.Element {
  if (report.dailyBreakdown.length === 0) {
    return (
      <EmptyState
        title="No hours recorded for this period"
        description={`No time entries found for ${report.clientName} in this period.`}
        action={
          <Button asChild>
            <Link href="/time-tracking/new">Log time</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <dt className="text-sm font-medium text-muted-foreground">Hours worked</dt>
          <dd className="text-2xl font-bold tabular-nums">
            {AnalyticsService.formatDuration(report.totalMinutes)}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm font-medium text-muted-foreground">Billable hours</dt>
          <dd className="text-2xl font-bold tabular-nums">
            {AnalyticsService.formatDuration(report.billableMinutes)}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm font-medium text-muted-foreground">Amount to invoice</dt>
          <dd className="text-2xl font-bold tabular-nums">
            {formatPublishedAmounts(report.accrued.byCurrency)}
          </dd>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <caption className="text-left text-base font-semibold mb-2">
            Daily Breakdown - {report.clientName}
          </caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="text-left py-2 pr-4 font-medium">
                Date
              </th>
              <th scope="col" className="text-right py-2 pr-4 font-medium">
                Worked
              </th>
              <th scope="col" className="text-left py-2 pr-4 font-medium">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {report.dailyBreakdown.map((day) => {
              const dateKey = day.workDate.toISOString();
              const totalHours = AnalyticsService.formatDuration(day.totalMinutes);
              const dateDisplay = formatItalianDate(day.workDate);

              const combinedDescription = day.entries
                .map((e) => e.description || "No description")
                .join(" | ");

              return (
                <tr key={dateKey} className="border-b hover:bg-muted/50">
                  <td className="py-2 pr-4">{dateDisplay}</td>
                  <td className="text-right py-2 pr-4 tabular-nums">{totalHours}</td>
                  <td className="py-2 pr-4">
                    <span className="text-sm">{combinedDescription}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <td className="py-3 pr-4">Monthly Total</td>
              <td className="text-right py-3 pr-4 tabular-nums">
                {AnalyticsService.formatDuration(report.totalMinutes)}
              </td>
              <td className="py-3 pr-4"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
