// src/application/analytics/expected-revenue.ts
import { publishMonetaryAmount } from "@/application/analytics/accrued-revenue";
import type {
  AnalyticsPeriod,
  ExpectedByContract,
  ExpectedContractFact,
  ExpectedRevenue,
} from "@/domain/analytics-types";

export type CalculateProRataCapacity = (
  monthlyContractedMinutes: number | null,
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
 * HOURLY + capacity → liveRate × (proRataMinutes / 60)
 * HOURLY + null capacity → null
 * DAILY → null
 * Overlap 0 with capacity present → 0, not null
 */
export function expectedAmountForContract(
  contract: ExpectedContractFact,
  period: AnalyticsPeriod,
  calculateProRataCapacity: CalculateProRataCapacity,
): number | null {
  if (contract.billingModel !== "HOURLY") {
    return null;
  }

  const proRataMinutes = calculateProRataCapacity(
    contract.monthlyContractedMinutes,
    contract.validFrom,
    contract.validTo,
    period,
  );

  if (proRataMinutes === null) {
    return null;
  }

  return parseLiveRate(contract.rate) * (proRataMinutes / 60);
}

/**
 * Authoritative Expected Revenue (R2-E01 / P-E01-03).
 *
 * Independent of TimeEntry, Accrued snapshots, Invoice, Payment, and Forecast.
 * Uses live Contract billingModel, rate, currency, monthlyContractedMinutes,
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
    });

  const byCurrency = [...currencyUnrounded.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, unrounded]) => ({
      currency,
      unrounded,
      published: publishMonetaryAmount(unrounded),
    }));

  return { period, timezone, byCurrency, byContract };
}
