// src/application/analytics/accrued-revenue.ts
import type {
  AccruedByContract,
  AccruedRevenue,
  AccruedTimeEntryFact,
  AnalyticsPeriod,
} from "@/domain/analytics-types";
import { getCalendarDateKey } from "@/lib/analytics-periods";

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

type DailySlice = {
  minutes: number;
  rate: number;
  currency: string;
};

type DailyBucket = {
  contractId: string;
  slices: DailySlice[];
  totalMinutes: number;
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
 * DAILY: at most one billable day per Contract + workspace calendar date,
 * using the R2-OD-016 minute-weighted daily rate:
 *
 *   Σ (snapshotMinutes / totalBillableMinutesForContractAndDate × snapshotDailyRate)
 *
 * The denominator is all billable minutes for that Contract/date, regardless
 * of snapshotCurrency. Each weighted term is published in its own
 * snapshotCurrency. No FX and no mixed-currency total.
 *
 * `workDate` is a workspace calendar date stored at UTC midnight. Grouping
 * uses that stored calendar date (`getCalendarDateKey`). Workspace.timezone
 * is the authority for resolving the caller's AnalyticsPeriod / "today".
 * Stored workDate values are not reinterpreted as instants.
 */
export function calculateAccruedRevenue(
  period: AnalyticsPeriod,
  entries: readonly AccruedTimeEntryFact[],
  timezone: string,
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

    const dateKey = getCalendarDateKey(entry.workDate);
    const bucketKey = `${entry.contractId}\0${dateKey}`;
    const rate = parseSnapshotRate(entry.snapshotRate);
    const bucket = dailyBuckets.get(bucketKey);

    if (bucket) {
      bucket.totalMinutes += entry.durationMinutes;
      bucket.slices.push({
        minutes: entry.durationMinutes,
        rate,
        currency: entry.snapshotCurrency,
      });
      continue;
    }

    dailyBuckets.set(bucketKey, {
      contractId: entry.contractId,
      totalMinutes: entry.durationMinutes,
      slices: [
        {
          minutes: entry.durationMinutes,
          rate,
          currency: entry.snapshotCurrency,
        },
      ],
    });
  }

  for (const bucket of dailyBuckets.values()) {
    if (bucket.totalMinutes <= 0) {
      continue;
    }

    for (const slice of bucket.slices) {
      addAmount(
        currencyUnrounded,
        contractUnrounded,
        bucket.contractId,
        slice.currency,
        (slice.minutes / bucket.totalMinutes) * slice.rate,
      );
    }
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

  return { period, timezone, byCurrency, byContract };
}
