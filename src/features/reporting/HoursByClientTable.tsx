// src/features/reporting/HoursByClientTable.tsx
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { EmptyState } from "@/components/states/EmptyState";
import type { ClientAllocation } from "@/domain/analytics-types";
import type { JSX } from "react";

type HoursByClientTableProps = {
  clientAllocations: ClientAllocation[];
};

export function HoursByClientTable({
  clientAllocations,
}: HoursByClientTableProps): JSX.Element {
  if (clientAllocations.length === 0) {
    return (
      <EmptyState
        title="No hours recorded for this period"
        description="Time logged for clients will appear here once you start tracking."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <caption className="text-left text-base font-semibold mb-2">
          Hours by Client
        </caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="text-left py-2 pr-4 font-medium">
              Client
            </th>
            <th scope="col" className="text-right py-2 pr-4 font-medium">
              Total
            </th>
            <th scope="col" className="text-right py-2 pr-4 font-medium">
              Billable
            </th>
            <th scope="col" className="text-right py-2 font-medium">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {clientAllocations.map((allocation) => {
            const totalHours = AnalyticsService.formatDuration(
              allocation.totalMinutes,
            );
            const billableHours = AnalyticsService.formatDuration(
              allocation.billableMinutes,
            );
            const share = AnalyticsService.formatPercentage(
              allocation.percentage,
            );

            return (
              <tr key={allocation.clientId} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  <span
                    title={allocation.clientName}
                    className="max-w-[12rem] inline-block truncate align-bottom"
                    aria-label={allocation.clientName}
                  >
                    {allocation.clientName}
                  </span>
                  {allocation.isArchived && (
                    <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded align-middle">
                      Archived
                    </span>
                  )}
                </td>
                <td className="text-right py-2 pr-4 tabular-nums">
                  {totalHours}
                </td>
                <td className="text-right py-2 pr-4 tabular-nums">
                  {billableHours}
                </td>
                <td className="text-right py-2 tabular-nums">{share}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
