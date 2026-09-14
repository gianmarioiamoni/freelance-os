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
 * Contract utilization within a period
 */
export type ContractUtilization = {
  contractId: string;
  clientName: string;
  consumedMinutes: number;
  contractedMinutes: number | null; // null for unlimited/ongoing contracts
  utilizationPercentage: number | null; // null for unlimited contracts
  isOngoing: boolean; // true when contractedMinutes is null
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