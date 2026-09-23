// src/application/analytics/contract-allocation.ts
import type {
  AllocationStatus,
  ContractAllocation,
  ContractAllocationFact,
} from "@/domain/analytics-types";

/**
 * Derived allocation status from integer minutes.
 *
 * Null or zero allocation ⇒ no status and no ratio (E04-D-ALLOCATION-ZERO-STATUS / 8-C).
 * WARNING is inclusive of 80% and 100%. EXCEEDED is strictly above 100%.
 */
export function deriveAllocationStatus(
  allocatedMinutes: number | null,
  consumedMinutes: number,
): AllocationStatus | null {
  if (allocatedMinutes === null || allocatedMinutes === 0) {
    return null;
  }

  if (consumedMinutes > allocatedMinutes) {
    return "EXCEEDED";
  }

  // consumed / allocated >= 0.80  ≡  consumed * 5 >= allocated * 4
  if (consumedMinutes * 5 >= allocatedMinutes * 4) {
    return "WARNING";
  }

  return "NORMAL";
}

export function deriveRemainingMinutes(
  allocatedMinutes: number | null,
  consumedMinutes: number,
): number | null {
  if (allocatedMinutes === null) {
    return null;
  }

  return Math.max(allocatedMinutes - consumedMinutes, 0);
}

/**
 * Derived Contract allocation view. Consumption is supplied as a fact;
 * remaining and status are not persisted.
 */
export function calculateContractAllocation(
  fact: ContractAllocationFact,
): ContractAllocation {
  return {
    contractId: fact.contractId,
    allocatedMinutes: fact.allocatedMinutes,
    consumedMinutes: fact.consumedMinutes,
    remainingMinutes: deriveRemainingMinutes(fact.allocatedMinutes, fact.consumedMinutes),
    allocationStatus: deriveAllocationStatus(fact.allocatedMinutes, fact.consumedMinutes),
  };
}
