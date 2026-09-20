// src/features/time-entries/eligible-contracts.ts
import { isContractValidForDate } from "@/application/time-entries/contract-validation";
import type { ContractRecord } from "@/domain/persistence-types";

const UTC_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a date-only `YYYY-MM-DD` or an existing Date as UTC midnight.
 * Does not use process-local getters or `new Date("YYYY-MM-DD")`.
 */
export function parseUtcDateOnly(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (UTC_YMD.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Workspace contracts eligible for the current client and work date.
 * Interval is [validFrom, validTo). Server validation remains authoritative.
 */
export function filterEligibleContracts(
  contracts: ContractRecord[],
  clientId: string,
  workDate: string,
): ContractRecord[] {
  if (!clientId || !workDate) {
    return [];
  }

  const workDateUtc = parseUtcDateOnly(workDate);
  if (!workDateUtc) {
    return [];
  }

  return contracts.filter((contract) => {
    if (contract.clientId !== clientId) {
      return false;
    }

    const validFrom = parseUtcDateOnly(contract.validFrom);
    if (!validFrom) {
      return false;
    }

    const validTo = contract.validTo
      ? parseUtcDateOnly(contract.validTo)
      : null;
    if (contract.validTo && !validTo) {
      return false;
    }

    return isContractValidForDate(
      { ...contract, validFrom, validTo },
      workDateUtc,
    );
  });
}
