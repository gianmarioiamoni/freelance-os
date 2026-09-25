// src/features/reporting/ContractReportTable.tsx
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import type {
  ContractAllocation,
  ContractUtilization,
} from "@/domain/analytics-types";
import {
  allocationByContractId,
  reportAllocationDisplay,
} from "@/features/reporting/report-allocation-display";
import Link from "next/link";
import type { JSX } from "react";

type ContractReportTableProps = {
  contractUtilizations: ContractUtilization[];
  contractAllocations?: ContractAllocation[];
};

export function ContractReportTable({
  contractUtilizations,
  contractAllocations = [],
}: ContractReportTableProps): JSX.Element {
  if (contractUtilizations.length === 0) {
    return (
      <EmptyState
        title="No contracts for this period"
        description="Relevant contracts will appear here once contracts overlap with the selected period."
        action={
          <Button asChild>
            <Link href="/contracts/new">New contract</Link>
          </Button>
        }
      />
    );
  }

  const allocations = allocationByContractId(contractAllocations);

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
            <th scope="col" className="text-right py-2 pr-4 font-medium">
              Utilization
            </th>
            <th scope="col" className="text-right py-2 pr-4 font-medium">
              Allocated
            </th>
            <th scope="col" className="text-right py-2 pr-4 font-medium">
              Allocation consumed
            </th>
            <th scope="col" className="text-right py-2 pr-4 font-medium">
              Remaining
            </th>
            <th scope="col" className="text-right py-2 font-medium">
              Allocation
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
            const allocation = reportAllocationDisplay(
              allocations.get(u.contractId),
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
                    {u.isArchived && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Archived
                      </span>
                    )}
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
                <td className="text-right py-2 pr-4 tabular-nums">
                  {u.contractedMinutes !== null ? utilization : "—"}
                </td>
                <td className="text-right py-2 pr-4 tabular-nums">
                  {allocation.allocatedLabel}
                </td>
                <td className="text-right py-2 pr-4 tabular-nums">
                  {allocation.consumedLabel}
                </td>
                <td className="text-right py-2 pr-4 tabular-nums">
                  {allocation.remainingLabel}
                </td>
                <td className="text-right py-2">
                  <AllocationStatusCell
                    label={allocation.statusLabel}
                    tone={allocation.statusTone}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AllocationStatusCell({
  label,
  tone,
}: {
  label: string | null;
  tone: "default" | "warning" | "error" | null;
}): JSX.Element {
  if (label === null || tone === null) {
    return <span>—</span>;
  }

  const className =
    tone === "warning"
      ? "text-xs text-warning-foreground bg-warning px-1.5 py-0.5 rounded"
      : tone === "error"
        ? "text-xs text-destructive"
        : "text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded";

  return <span className={className}>{label}</span>;
}
