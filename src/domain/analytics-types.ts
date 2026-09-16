// src/domain/analytics-types.ts

/**
 * Analytics period representing a time range for calculations
 */
export type AnalyticsPeriod = {
  startDate: Date;
  endDate: Date;
};

/**
 * Monthly analytics summary for a workspace
 */
export type MonthlyAnalytics = {
  period: AnalyticsPeriod;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  billablePercentage: number | null; // null when totalMinutes is 0
  clientAllocations: ClientAllocation[];
  contractUtilizations: ContractUtilization[];
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