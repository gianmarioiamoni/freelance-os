// src/features/contracts/contract-allocation-display.ts
import type { AllocationStatus, ContractAllocation } from "@/domain/analytics-types";

export const ALLOCATION_NOT_CONFIGURED_LABEL = "Allocation not configured";

export function formatAllocationMinutes(minutes: number): string {
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export function allocationStatusLabel(
  status: AllocationStatus | null,
): string | null {
  if (status === null) {
    return null;
  }

  if (status === "NORMAL") {
    return "Normal";
  }

  if (status === "WARNING") {
    return "Warning";
  }

  return "Exceeded";
}

export function allocationStatusTone(
  status: AllocationStatus | null,
): "default" | "warning" | "error" | null {
  if (status === null) {
    return null;
  }

  if (status === "WARNING") {
    return "warning";
  }

  if (status === "EXCEEDED") {
    return "error";
  }

  return "default";
}

export function hasActiveAllocation(
  allocation: Pick<ContractAllocation, "allocatedMinutes">,
): boolean {
  return allocation.allocatedMinutes !== null && allocation.allocatedMinutes > 0;
}

export function isZeroAllocation(
  allocation: Pick<ContractAllocation, "allocatedMinutes">,
): boolean {
  return allocation.allocatedMinutes === 0;
}
