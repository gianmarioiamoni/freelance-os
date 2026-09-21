// src/application/analytics/accrued-revenue.ts
import type {
  AccruedByContract,
  AccruedRevenue,
  AccruedTimeEntryFact,
  AnalyticsPeriod,
} from "@/domain/analytics-types";

/**
 * R2-OD-002 publication rounding: nearest integer, ordinary half-up for
 * positive amounts. Intermediates stay unrounded.
 */
export function publishMonetaryAmount(unrounded: number): number {
  return Math.round(unrounded);
}

function parseSnapshotRate(rate: string): number {
  return Number(rate);
}

function utcDateKey(workDate: Date): string {
  const year = workDate.getUTCFullYear();
  const month = String(workDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(workDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type DailyBucket = {
  contractId: string;
  currency: string;
  totalMinutes: number;
  weightedRateMinutes: number;
};

type ContractBucket = {
  contractId: string;
  currency: string;
  unrounded: number;
};

function addAmount(
  currencyUnrounded: Map<string, number>,
  contractUnrounded: Map<string, ContractBucket>,
  contractId: string,
  currency: string,
  amount: number,
): void {
  currencyUnrounded.set(currency, (currencyUnrounded.get(currency) ?? 0) + amount);

  const key = `${contractId}\0${currency}`;
  const existing = contractUnrounded.get(key);
  if (existing) {
    existing.unrounded += amount;
    return;
  }

  contractUnrounded.set(key, { contractId, currency, unrounded: amount });
}

/**
 * Authoritative Accrued Revenue (R2-E01 / P-E01-02).
 *
 * HOURLY: billable minutes / 60 × that entry's snapshotRate.
 * DAILY: at most one billable day per Contract + calendar date + snapshotCurrency,
 * using the R2-OD-016 minute-weighted daily rate. Non-billable entries are
 * excluded from both the numerator and the denominator.
 *
 * Mixed snapshot currencies on the same Contract/date are not merged (D7).
 * The DAILY formula is applied independently per currency.
 */
export function calculateAccruedRevenue(
  period: AnalyticsPeriod,
  entries: readonly AccruedTimeEntryFact[],
): AccruedRevenue {
  const currencyUnrounded = new Map<string, number>();
  const contractUnrounded = new Map<string, ContractBucket>();
  const dailyBuckets = new Map<string, DailyBucket>();

  for (const entry of entries) {
    if (!entry.billable) {
      continue;
    }

    if (entry.snapshotBillingModel === "HOURLY") {
      const rate = parseSnapshotRate(entry.snapshotRate);
      addAmount(
        currencyUnrounded,
        contractUnrounded,
        entry.contractId,
        entry.snapshotCurrency,
        (entry.durationMinutes / 60) * rate,
      );
      continue;
    }

    const dateKey = utcDateKey(entry.workDate);
    const bucketKey = `${entry.contractId}\0${dateKey}\0${entry.snapshotCurrency}`;
    const rate = parseSnapshotRate(entry.snapshotRate);
    const bucket = dailyBuckets.get(bucketKey);

    if (bucket) {
      bucket.totalMinutes += entry.durationMinutes;
      bucket.weightedRateMinutes += entry.durationMinutes * rate;
      continue;
    }

    dailyBuckets.set(bucketKey, {
      contractId: entry.contractId,
      currency: entry.snapshotCurrency,
      totalMinutes: entry.durationMinutes,
      weightedRateMinutes: entry.durationMinutes * rate,
    });
  }

  for (const bucket of dailyBuckets.values()) {
    if (bucket.totalMinutes <= 0) {
      continue;
    }

    addAmount(
      currencyUnrounded,
      contractUnrounded,
      bucket.contractId,
      bucket.currency,
      bucket.weightedRateMinutes / bucket.totalMinutes,
    );
  }

  const byCurrency = [...currencyUnrounded.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, unrounded]) => ({
      currency,
      unrounded,
      published: publishMonetaryAmount(unrounded),
    }));

  const byContract: AccruedByContract[] = [...contractUnrounded.values()]
    .sort(
      (left, right) =>
        left.contractId.localeCompare(right.contractId) ||
        left.currency.localeCompare(right.currency),
    )
    .map((row) => ({
      contractId: row.contractId,
      currency: row.currency,
      unrounded: row.unrounded,
      published: publishMonetaryAmount(row.unrounded),
    }));

  return { period, byCurrency, byContract };
}
