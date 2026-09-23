// src/domain/analytics-types.ts

/**
 * Analytics period representing a time range for calculations
 */
export type AnalyticsPeriod = {
  startDate: Date;
  endDate: Date;
};

/**
 * Hours-only monthly analytics produced by the analytics repository.
 * Monetary figures are composed by AnalyticsService (P-E01-04).
 */
export type MonthlyHoursAnalytics = {
  period: AnalyticsPeriod;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  billablePercentage: number | null; // null when totalMinutes is 0
  clientAllocations: ClientAllocation[];
  contractUtilizations: ContractUtilization[];
};

/**
 * Monthly analytics summary for a workspace.
 * Accrued / Expected are per-currency. There is no mixed-currency total.
 */
export type MonthlyAnalytics = MonthlyHoursAnalytics & {
  accrued: AccruedRevenue;
  expected: ExpectedRevenue;
  /** Present only when `period` is a certified current period. */
  forecast: ForecastRevenue | null;
};

/**
 * Client time allocation within a period
 */
export type ClientAllocation = {
  clientId: string;
  clientName: string;
  isArchived: boolean;
  totalMinutes: number;
  billableMinutes: number;
  percentage: number | null; // percentage of total period time, null when total is 0
};

/**
 * Contract utilization within a period.
 *
 * BR-105-016: `isOngoing ≡ validTo === null`; `unlimited ≡ contractedMinutes === null`.
 * The two properties are independent. A contract can be ongoing with finite capacity,
 * or finite with null (unlimited) capacity.
 *
 * BR-105-017: `contractedMinutes` is the pro-rata capacity for the reporting period,
 * derived from `monthlyContractedMinutes` × (overlapDays / periodDays). Null when
 * `monthlyContractedMinutes === null` (no capacity denominator invented).
 *
 * BR-105-018: A contract is included if it is relevant to the period (validity overlap
 * or in-period consumption). Time recorded outside a contract's validity is retained in
 * `consumedMinutes` and flagged via `isOutOfValidity`.
 */
export type ContractUtilization = {
  contractId: string;
  clientName: string;
  /** True when the related client is archived. */
  isArchived: boolean;
  /** Contract validity start (inclusive). */
  validFrom: Date;
  /** Contract validity end (exclusive). null means the contract is ongoing. */
  validTo: Date | null;
  /** True when validTo === null (BR-105-016). Independent from contractedMinutes. */
  isOngoing: boolean;
  consumedMinutes: number;
  /**
   * Pro-rated contracted minutes for the reporting period (BR-105-017).
   * null when monthlyContractedMinutes is null (unlimited capacity — no denominator invented).
   */
  contractedMinutes: number | null;
  /**
   * Utilization percentage (consumedMinutes / contractedMinutes × 100).
   * null when contractedMinutes is null or 0 (BR-104-011).
   */
  utilizationPercentage: number | null;
  /**
   * True when any consumed time falls outside the contract's [validFrom, validTo) validity
   * interval (BR-105-018). Such time is retained in consumedMinutes and flagged here.
   */
  isOutOfValidity: boolean;
};

/**
 * Daily analytics aggregation
 */
export type DailyAnalytics = {
  workDate: Date;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  clientBreakdown: DailyClientBreakdown[];
};

/**
 * Client breakdown for a single day
 */
export type DailyClientBreakdown = {
  clientId: string;
  clientName: string;
  totalMinutes: number;
  billableMinutes: number;
};

/**
 * Weekly analytics aggregation composed from daily rows (F-104-013, P105-03).
 * Totals are the sum of all daily rows within the week period.
 */
export type WeeklyAnalytics = {
  period: AnalyticsPeriod;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  billablePercentage: number | null; // null when totalMinutes is 0
  days: DailyAnalytics[]; // ordered daily rows; empty days are omitted
};

/**
 * Discriminated union of named reporting period kinds.
 * Used by the reporting layer to express which period type was requested.
 * Custom ranges carry explicit start/end dates; named kinds are resolved
 * against Workspace.timezone at the application boundary (BR-105-014).
 */
export type ReportingPeriodKind =
  | { kind: "today" }
  | { kind: "week" }
  | { kind: "month" }
  | { kind: "year" }
  | { kind: "custom"; startDate: Date; endDate: Date };

/**
 * Quantity + historical commercial snapshot facts consumed by Accrued Revenue.
 * Duration is the live TimeEntry quantity fact, not a commercial snapshot column.
 */
export type AccruedTimeEntryFact = {
  contractId: string;
  workDate: Date;
  durationMinutes: number;
  billable: boolean;
  snapshotBillingModel: "HOURLY" | "DAILY";
  snapshotRate: string;
  snapshotCurrency: string;
};

/**
 * One published Accrued figure in a single snapshot currency.
 * There is no mixed-currency total (D7 / R2-OD-002).
 */
export type AccruedAmount = {
  currency: string;
  unrounded: number;
  published: number;
};

/**
 * Accrued for one Contract in one snapshot currency.
 */
export type AccruedByContract = {
  contractId: string;
  currency: string;
  unrounded: number;
  published: number;
};

/**
 * Authoritative Accrued Revenue for a reporting period.
 * Grouped by snapshot currency. No FX and no mixed-currency grand total.
 */
export type AccruedRevenue = {
  period: AnalyticsPeriod;
  timezone: string;
  byCurrency: AccruedAmount[];
  byContract: AccruedByContract[];
};

/**
 * Live Contract commercial configuration consumed by Expected Revenue.
 * Independent of TimeEntry quantity and of Accrued snapshots.
 */
export type ExpectedContractFact = {
  contractId: string;
  billingModel: "HOURLY" | "DAILY";
  rate: string;
  currency: string;
  monthlyContractedMinutes: number | null;
  validFrom: Date;
  validTo: Date | null;
};

/**
 * One published Expected figure in a single live Contract currency.
 * There is no mixed-currency total (D7 / R2-OD-002).
 */
export type ExpectedAmount = {
  currency: string;
  unrounded: number;
  published: number;
};

/**
 * Expected for one Contract in its live currency.
 * `null` when Expected is not available (DAILY, or HOURLY without capacity).
 */
export type ExpectedByContract = {
  contractId: string;
  currency: string;
  unrounded: number | null;
  published: number | null;
};

/**
 * Authoritative Expected Revenue for a reporting period.
 * Grouped by live Contract currency. No FX and no mixed-currency grand total.
 */
export type ExpectedRevenue = {
  period: AnalyticsPeriod;
  timezone: string;
  byCurrency: ExpectedAmount[];
  byContract: ExpectedByContract[];
};

/**
 * Authoritative Forecast Revenue for a certified current period.
 * Derived from Accrued only. Not persisted.
 */
export type ForecastRevenue = {
  period: AnalyticsPeriod;
  timezone: string;
  elapsedPeriod: number;
  totalPeriod: number;
  byCurrency: AccruedAmount[];
  byContract: AccruedByContract[];
};

/**
 * Persistence/read fact for Contract allocation consumption.
 * Consumption is already restricted to [validFrom, validTo).
 */
export type ContractAllocationFact = {
  contractId: string;
  allocatedMinutes: number | null;
  validFrom: Date;
  validTo: Date | null;
  consumedMinutes: number;
};

export type AllocationStatus = "NORMAL" | "WARNING" | "EXCEEDED";

/**
 * Derived Contract allocation view. Remaining and status are not persisted.
 * `remainingMinutes` and `allocationStatus` are null when allocation is absent.
 */
export type ContractAllocation = {
  contractId: string;
  allocatedMinutes: number | null;
  consumedMinutes: number;
  remainingMinutes: number | null;
  allocationStatus: AllocationStatus | null;
};
