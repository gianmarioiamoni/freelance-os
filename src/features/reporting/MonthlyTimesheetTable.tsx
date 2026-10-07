"use client";

import type { MonthlyTimesheetReport } from "@/application/reporting/reporting-service";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { formatPublishedAmounts } from "@/features/reporting/revenue-display";
import Link from "next/link";
import { type JSX, useState } from "react";

type MonthlyTimesheetTableProps = {
  report: MonthlyTimesheetReport;
};

export function MonthlyTimesheetTable({
  report,
}: MonthlyTimesheetTableProps): JSX.Element {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

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

  function toggleDate(dateKey: string): void {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
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
              <th scope="col" className="text-right py-2 pr-4 font-medium">
                Billable
              </th>
              <th scope="col" className="text-center py-2 font-medium">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {report.dailyBreakdown.map((day) => {
              const dateKey = day.workDate.toISOString();
              const isExpanded = expandedDates.has(dateKey);
              const totalHours = AnalyticsService.formatDuration(day.totalMinutes);
              const billableHours = AnalyticsService.formatDuration(day.billableMinutes);
              const dateDisplay = new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
              }).format(day.workDate);

              return (
                <>
                  <tr key={dateKey} className="border-b hover:bg-muted/50">
                    <td className="py-2 pr-4">{dateDisplay}</td>
                    <td className="text-right py-2 pr-4 tabular-nums">{totalHours}</td>
                    <td className="text-right py-2 pr-4 tabular-nums">{billableHours}</td>
                    <td className="text-center py-2">
                      <button
                        type="button"
                        onClick={() => toggleDate(dateKey)}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} details for ${dateDisplay}`}
                        className="px-2 py-1 text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                      >
                        {isExpanded ? "▼" : "▶"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded &&
                    day.entries.map((entry, idx) => (
                      <tr
                        key={`${dateKey}-${entry.id}-${idx}`}
                        className="bg-muted/30 border-b last:border-0"
                      >
                        <td className="py-2 pr-4 pl-8 text-muted-foreground text-xs">
                          {entry.description || "No description"}
                        </td>
                        <td className="text-right py-2 pr-4 tabular-nums text-xs">
                          {AnalyticsService.formatDuration(entry.durationMinutes)}
                        </td>
                        <td className="text-right py-2 pr-4 text-xs">
                          {entry.billable ? (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                              Billable
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              Non-billable
                            </span>
                          )}
                        </td>
                        <td></td>
                      </tr>
                    ))}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <td className="py-3 pr-4">Monthly Total</td>
              <td className="text-right py-3 pr-4 tabular-nums">
                {AnalyticsService.formatDuration(report.totalMinutes)}
              </td>
              <td className="text-right py-3 pr-4 tabular-nums">
                {AnalyticsService.formatDuration(report.billableMinutes)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
