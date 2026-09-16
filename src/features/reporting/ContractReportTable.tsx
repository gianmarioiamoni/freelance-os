// src/features/reporting/ContractReportTable.tsx
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { EmptyState } from "@/components/states/EmptyState";
import type { ContractUtilization } from "@/domain/analytics-types";
import type { JSX } from "react";

type ContractReportTableProps = {
  contractUtilizations: ContractUtilization[];
};

export function ContractReportTable({
  contractUtilizations,
}: ContractReportTableProps): JSX.Element {
  if (contractUtilizations.length === 0) {
    return (
      <EmptyState
        title="No contracts for this period"
        description="Relevant contracts will appear here once contracts overlap with the selected period."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <caption className="text-left text-base font-semibold mb-2">
          Contract Report
        </caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="text-left py-2 pr-4 font-medium">
              Client
            </th>
            <th scope="col" className="text-right py-2 pr-4 font-medium">
              Consumed
            </th>
            <th scope="col" className="text-right py-2 pr-4 font-medium">
              Capacity
            </th>
            <th scope="col" className="text-right py-2 font-medium">
              Utilization
            </th>
          </tr>
        </thead>
        <tbody>
          {contractUtilizations.map((u) => {
            const consumed = AnalyticsService.formatDuration(u.consumedMinutes);
            const capacity =
              u.contractedMinutes !== null
                ? AnalyticsService.formatDuration(u.contractedMinutes)
                : "Unlimited";
            const utilization = AnalyticsService.formatPercentage(
              u.utilizationPercentage,
            );

            return (
              <tr key={u.contractId} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  <span
                    title={u.clientName}
                    className="max-w-[12rem] inline-block truncate align-bottom"
                    aria-label={u.clientName}
                  >
                    {u.clientName}
                  </span>
                  <span className="ml-2 inline-flex gap-1">
                    {u.isOngoing && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Ongoing
                      </span>
                    )}
                    {u.isOutOfValidity && (
                      <span
                        className="text-xs text-warning-foreground bg-warning px-1.5 py-0.5 rounded"
                        title="Some tracked time falls outside this contract's validity period"
                        aria-label="out of validity: some tracked time falls outside this contract's validity period"
                      >
                        ⚠ Out of validity
                      </span>
                    )}
                  </span>
                </td>
                <td className="text-right py-2 pr-4 tabular-nums">{consumed}</td>
                <td className="text-right py-2 pr-4 tabular-nums">{capacity}</td>
                <td className="text-right py-2 tabular-nums">
                  {u.contractedMinutes !== null ? utilization : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
