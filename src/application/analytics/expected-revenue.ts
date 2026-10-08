// src/application/analytics/expected-revenue.ts
import { publishMonetaryAmount } from "@/application/analytics/accrued-revenue";
import type {
  AnalyticsPeriod,
  ExpectedByContract,
  ExpectedContractFact,
  ExpectedRevenue,
} from "@/domain/analytics-types";

export type CalculateProRataCapacity = (
  commitmentPercentage: number,
  validFrom: Date,
  validTo: Date | null,
  period: AnalyticsPeriod,
) => number | null;

function parseLiveRate(rate: string): number {
  return Number(rate);
}

/**
 * Per-contract Expected amount from live commercial configuration.
 *
 * HOURLY + commitmentPercentage → liveRate × (proRataMinutes / 60)
 * DAILY → null
 * 0% commitment → undefined (excluded)
 * Overlap 0 with commitment present → 0, not null
 */
export function expectedAmountForContract(
  contract: ExpectedContractFact,
  period: AnalyticsPeriod,
  calculateProRataCapacity: CalculateProRataCapacity,
): number | null | undefined {
  if (contract.billingModel !== "HOURLY") {
    return null;
  }

  // No capacity = no expected revenue (skip entirely)
  if (contract.commitmentPercentage === 0) {
    return undefined; // Signal to filter out entirely
  }

  const proRataMinutes = calculateProRataCapacity(
    contract.commitmentPercentage,
    contract.validFrom,
    contract.validTo,
    period,
  );

  if (proRataMinutes === null) {
    return null;
  }

  if (proRataMinutes === 0) {
    return 0; // Zero overlap but contract exists
  }

  return parseLiveRate(contract.rate) * (proRataMinutes / 60);
}

/**
 * Authoritative Expected Revenue (R2-E01 / P-E01-03).
 *
 * Independent of TimeEntry, Accrued snapshots, Invoice, Payment, and Forecast.
 * Uses live Contract billingModel, rate, currency, commitmentPercentage,
 * and [validFrom, validTo). Pro-rata capacity is PD-105-005.
 */
export function calculateExpectedRevenue(
  period: AnalyticsPeriod,
  contracts: readonly ExpectedContractFact[],
  timezone: string,
  calculateProRataCapacity: CalculateProRataCapacity,
): ExpectedRevenue {
  const currencyUnrounded = new Map<string, number>();
  const byContract: ExpectedByContract[] = [...contracts]
    .sort(
      (left, right) =>
        left.contractId.localeCompare(right.contractId) ||
        left.currency.localeCompare(right.currency),
    )
    .map((contract) => {
      const unrounded = expectedAmountForContract(
        contract,
        period,
        calculateProRataCapacity,
      );

      // undefined = exclude entirely (0% commitment)
      if (unrounded === undefined) {
        return undefined;
      }

      if (unrounded !== null) {
        currencyUnrounded.set(
          contract.currency,
          (currencyUnrounded.get(contract.currency) ?? 0) + unrounded,
        );
      }

      return {
        contractId: contract.contractId,
        currency: contract.currency,
        unrounded,
        published: unrounded === null ? null : publishMonetaryAmount(unrounded),
      };
    })
    .filter((entry): entry is ExpectedByContract => entry !== undefined);

  const byCurrency = [...currencyUnrounded.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, unrounded]) => ({
      currency,
      unrounded,
      published: publishMonetaryAmount(unrounded),
    }));

  return { period, timezone, byCurrency, byContract };
}
