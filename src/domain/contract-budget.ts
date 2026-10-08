// src/domain/contract-budget.ts

/**
 * Calculate contract total budget from monthly capacity and duration.
 *
 * Semantic:
 * - allocatedMinutes = total contract budget (lifetime).
 * - monthlyContractedMinutes = monthly recurring capacity.
 *
 * Precedence:
 * 1. Explicit allocatedMinutes (if provided) is authoritative.
 * 2. If allocatedMinutes is null, derive from monthlyContractedMinutes × duration.
 * 3. If validTo is null (ongoing), return null.
 * 4. If monthlyContractedMinutes is null, return null.
 *
 * @param validFrom - Contract start date (inclusive).
 * @param validTo - Contract end date (exclusive). null = ongoing.
 * @param monthlyContractedMinutes - Monthly recurring capacity. null = no monthly budget.
 * @returns Calculated allocatedMinutes or null if not derivable.
 */
export function calculateContractAllocatedMinutes(
  validFrom: Date,
  validTo: Date | null,
  monthlyContractedMinutes: number | null,
): number | null {
  // Ongoing contracts: cannot derive total budget without end date
  if (validTo === null) {
    return null;
  }

  // No monthly capacity: cannot derive total budget
  if (monthlyContractedMinutes === null) {
    return null;
  }

  // Calculate calendar months between validFrom and validTo
  const months = differenceInCalendarMonths(validTo, validFrom);

  // Total budget = monthly capacity × duration in months
  return monthlyContractedMinutes * months;
}

/**
 * Derive contract allocated minutes from input or calculation.
 *
 * Precedence:
 * 1. If explicitAllocatedMinutes is provided (not null), use it.
 * 2. Otherwise, calculate from monthlyContractedMinutes and duration.
 *
 * @param validFrom - Contract start date.
 * @param validTo - Contract end date (exclusive). null = ongoing.
 * @param monthlyContractedMinutes - Monthly recurring capacity.
 * @param explicitAllocatedMinutes - Explicit total budget from input (optional).
 * @returns Explicit or derived allocatedMinutes, or null.
 */
export function deriveContractAllocatedMinutes(
  validFrom: Date,
  validTo: Date | null,
  monthlyContractedMinutes: number | null,
  explicitAllocatedMinutes: number | null | undefined,
): number | null {
  // Explicit value wins (even if 0)
  if (explicitAllocatedMinutes !== null && explicitAllocatedMinutes !== undefined) {
    return explicitAllocatedMinutes;
  }

  // Otherwise, calculate from monthly capacity + duration
  return calculateContractAllocatedMinutes(
    validFrom,
    validTo,
    monthlyContractedMinutes,
  );
}

/**
 * Calculate difference in calendar months between two dates.
 * Uses year and month components only, ignoring day-of-month.
 *
 * Examples:
 * - 2026-01-15 to 2026-03-10 = 2 months (Jan → Feb → Mar = 2 transitions)
 * - 2026-01-01 to 2026-07-01 = 6 months
 * - 2026-01-01 to 2027-01-01 = 12 months
 *
 * @param endDate - End date (exclusive in contract context).
 * @param startDate - Start date (inclusive in contract context).
 * @returns Number of calendar months between dates.
 */
function differenceInCalendarMonths(endDate: Date, startDate: Date): number {
  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();
  const endYear = endDate.getUTCFullYear();
  const endMonth = endDate.getUTCMonth();

  return (endYear - startYear) * 12 + (endMonth - startMonth);
}
