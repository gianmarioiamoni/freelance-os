// src/domain/contract-commitment.ts
import { countWorkingDays, countWorkingDaysInMonth } from "@/lib/working-days";

/**
 * Contract commitment mode - how the commitment is specified by user.
 */
export type CommitmentMode = "PERCENTAGE" | "TOTAL_HOURS";

/**
 * Calculate contract commitment from user input.
 *
 * Canonical representation: commitmentPercentage (0-100+)
 *
 * PERCENTAGE mode: use input directly
 * TOTAL_HOURS mode: derive percentage from total hours and contract capacity
 *
 * @param mode - How commitment is specified
 * @param value - Percentage (0-100+) or total hours
 * @param validFrom - Contract start (inclusive)
 * @param validTo - Contract end (exclusive), null = ongoing
 * @returns Commitment percentage, or null if cannot calculate
 */
export function calculateCommitmentPercentage(
  mode: CommitmentMode,
  value: number,
  validFrom: Date,
  validTo: Date | null,
): number | null {
  if (mode === "PERCENTAGE") {
    return value;
  }

  // TOTAL_HOURS mode: convert to percentage
  if (validTo === null) {
    // Cannot calculate capacity for ongoing contracts
    return null;
  }

  const workingDays = countWorkingDays(validFrom, validTo);
  if (workingDays === 0) {
    return null;
  }

  const contractWorkingCapacityHours = workingDays * 8;
  return (value / contractWorkingCapacityHours) * 100;
}

/**
 * Calculate total contract hours from commitment percentage.
 *
 * @param commitmentPercentage - Commitment as percentage (0-100+)
 * @param validFrom - Contract start (inclusive)
 * @param validTo - Contract end (exclusive), null = ongoing
 * @returns Total contract hours, or null if cannot calculate
 */
export function calculateTotalContractHours(
  commitmentPercentage: number,
  validFrom: Date,
  validTo: Date | null,
): number | null {
  if (validTo === null) {
    // Ongoing contracts have no finite total hours
    return null;
  }

  const workingDays = countWorkingDays(validFrom, validTo);
  if (workingDays === 0) {
    return null;
  }

  return (commitmentPercentage / 100) * workingDays * 8;
}

/**
 * Calculate allocated minutes (lifetime contract budget) from commitment percentage.
 *
 * @param commitmentPercentage - Commitment as percentage (0-100+)
 * @param validFrom - Contract start (inclusive)
 * @param validTo - Contract end (exclusive), null = ongoing
 * @returns Allocated minutes, or null if cannot calculate
 */
export function calculateAllocatedMinutes(
  commitmentPercentage: number,
  validFrom: Date,
  validTo: Date | null,
): number | null {
  const totalHours = calculateTotalContractHours(
    commitmentPercentage,
    validFrom,
    validTo,
  );

  if (totalHours === null) {
    return null;
  }

  return Math.round(totalHours * 60);
}

/**
 * Calculate monthly contracted minutes for a specific month.
 *
 * This is the SOURCE OF TRUTH for monthly quota calculation.
 * Used by Dashboard Monthly Hours, Reports, and any analytics requiring monthly capacity.
 *
 * @param commitmentPercentage - Commitment as percentage (0-100+)
 * @param year - Full year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Monthly contracted minutes for that month
 */
export function getMonthlyContractedMinutes(
  commitmentPercentage: number,
  year: number,
  month: number,
): number {
  const workingDays = countWorkingDaysInMonth(year, month);
  const monthlyHours = (commitmentPercentage / 100) * workingDays * 8;
  return Math.round(monthlyHours * 60);
}
