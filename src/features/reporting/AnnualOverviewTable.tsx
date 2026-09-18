// src/features/reporting/AnnualOverviewTable.tsx
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import type { MonthlyAnalytics } from "@/domain/analytics-types";
import Link from "next/link";
import type { JSX } from "react";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

type AnnualOverviewTableProps = {
  months: MonthlyAnalytics[];
  year: number;
};

export function AnnualOverviewTable({
  months,
  year,
}: AnnualOverviewTableProps): JSX.Element {
  const hasAnyActivity = months.some((m) => m.totalMinutes > 0);

  if (!hasAnyActivity) {
    return (
      <EmptyState
        title="No activity recorded for this year"
        description="Monthly totals will appear here as you log time."
        action={
          <Button asChild>
            <Link href="/time-tracking/new">Log time</Link>
          </Button>
        }
      />
    );
  }

  const totalMinutes = months.reduce((sum, m) => sum + m.totalMinutes, 0);
  const billableMinutes = months.reduce((sum, m) => sum + m.billableMinutes, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <caption className="text-left text-base font-semibold mb-2">
          Annual Overview — {year}
        </caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="text-left py-2 pr-4 font-medium">
              Month
            </th>
            <th scope="col" className="text-right py-2 pr-4 font-medium">
              Total
            </th>
            <th scope="col" className="text-right py-2 pr-4 font-medium">
              Billable
            </th>
            <th scope="col" className="text-right py-2 font-medium">
              Billable %
            </th>
          </tr>
        </thead>
        <tbody>
          {months.map((month, i) => {
            const total = AnalyticsService.formatDuration(month.totalMinutes);
            const billable = AnalyticsService.formatDuration(
              month.billableMinutes,
            );
            const pct = AnalyticsService.formatPercentage(
              month.billablePercentage,
            );
            return (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 pr-4">{MONTH_NAMES[i]}</td>
                <td className="text-right py-2 pr-4 tabular-nums">
                  {month.totalMinutes > 0 ? total : "—"}
                </td>
                <td className="text-right py-2 pr-4 tabular-nums">
                  {month.totalMinutes > 0 ? billable : "—"}
                </td>
                <td className="text-right py-2 tabular-nums">
                  {month.totalMinutes > 0 ? pct : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t font-medium">
            <td className="py-2 pr-4">Total</td>
            <td className="text-right py-2 pr-4 tabular-nums">
              {AnalyticsService.formatDuration(totalMinutes)}
            </td>
            <td className="text-right py-2 pr-4 tabular-nums">
              {AnalyticsService.formatDuration(billableMinutes)}
            </td>
            <td className="text-right py-2 tabular-nums">
              {AnalyticsService.formatPercentage(
                totalMinutes > 0 ? (billableMinutes / totalMinutes) * 100 : null,
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
