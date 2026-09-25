// src/features/reporting/report-allocation-display.ts
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { ContractAllocation } from "@/domain/analytics-types";
import {
  allocationStatusLabel,
  allocationStatusTone,
} from "@/features/contracts/contract-allocation-display";

export type ReportAllocationDisplay = {
  allocatedLabel: string;
  consumedLabel: string;
  remainingLabel: string;
  statusLabel: string | null;
  statusTone: "default" | "warning" | "error" | null;
};

export function reportAllocationDisplay(
  allocation: ContractAllocation | undefined,
): ReportAllocationDisplay {
  if (allocation === undefined || allocation.allocatedMinutes === null) {
    return {
      allocatedLabel: "—",
      consumedLabel: "—",
      remainingLabel: "—",
      statusLabel: null,
      statusTone: null,
    };
  }

  return {
    allocatedLabel: AnalyticsService.formatDuration(allocation.allocatedMinutes),
    consumedLabel: AnalyticsService.formatDuration(allocation.consumedMinutes),
    remainingLabel:
      allocation.remainingMinutes === null
        ? "—"
        : AnalyticsService.formatDuration(allocation.remainingMinutes),
    statusLabel: allocationStatusLabel(allocation.allocationStatus),
    statusTone: allocationStatusTone(allocation.allocationStatus),
  };
}

export function allocationByContractId(
  allocations: readonly ContractAllocation[],
): Map<string, ContractAllocation> {
  return new Map(allocations.map((allocation) => [allocation.contractId, allocation]));
}
