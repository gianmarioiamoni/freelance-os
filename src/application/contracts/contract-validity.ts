// src/application/contracts/contract-validity.ts
import { InvalidContractPeriodError } from "@/domain/contract-errors";
import type { ContractRecord } from "@/domain/persistence-types";

export type ContractApplicability = "scheduled" | "current" | "ended";

export function assertValidContractPeriod(
  validFrom: Date,
  validTo: Date | null,
): void {
  if (validTo !== null && validTo.getTime() <= validFrom.getTime()) {
    throw new InvalidContractPeriodError();
  }
}

export function contractIntervalsOverlap(
  leftFrom: Date,
  leftTo: Date | null,
  rightFrom: Date,
  rightTo: Date | null,
): boolean {
  const leftEnd = leftTo === null ? Number.POSITIVE_INFINITY : leftTo.getTime();
  const rightEnd =
    rightTo === null ? Number.POSITIVE_INFINITY : rightTo.getTime();

  return leftFrom.getTime() < rightEnd && rightFrom.getTime() < leftEnd;
}

export function contractCoversDate(
  validFrom: Date,
  validTo: Date | null,
  date: Date,
): boolean {
  return (
    validFrom.getTime() <= date.getTime() &&
    (validTo === null || date.getTime() < validTo.getTime())
  );
}

export function deriveContractApplicability(
  validFrom: Date,
  validTo: Date | null,
  today: Date,
): ContractApplicability {
  if (validFrom.getTime() > today.getTime()) {
    return "scheduled";
  }

  if (validTo !== null && validTo.getTime() <= today.getTime()) {
    return "ended";
  }

  return "current";
}

export function hasOverlappingContract(
  existing: readonly ContractRecord[],
  validFrom: Date,
  validTo: Date | null,
  excludeContractId?: string,
): boolean {
  return existing.some((row) => {
    if (excludeContractId !== undefined && row.id === excludeContractId) {
      return false;
    }

    return contractIntervalsOverlap(
      validFrom,
      validTo,
      row.validFrom,
      row.validTo,
    );
  });
}
