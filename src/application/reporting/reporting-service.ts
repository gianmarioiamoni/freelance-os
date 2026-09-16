// src/application/reporting/reporting-service.ts
import type {
  AnalyticsPeriod,
  ClientAllocation,
  ContractUtilization,
  MonthlyAnalytics,
  ReportingPeriodKind,
} from "@/domain/analytics-types";
import type { AnalyticsService } from "@/application/analytics/analytics-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import {
  getTodayPeriod,
  getCurrentWeekPeriod,
  getCurrentMonthPeriod,
  getCurrentYearPeriod,
  getDateRangePeriod,
  isValidPeriod,
} from "@/lib/analytics-periods";

// ---------------------------------------------------------------------------
// Period request type
// ---------------------------------------------------------------------------

/**
 * Validated period-kind request.
 * Mirrors ReportingPeriodKind from the domain but used as the service input.
 */
export type PeriodKindRequest = ReportingPeriodKind;

// ---------------------------------------------------------------------------
// Reporting output types
// ---------------------------------------------------------------------------

/**
 * Full contract report for a period.
 *
 * BR-105-018: includes all relevant contracts (validity overlap ∪ in-period
 * consumption). Zero-consumption contracts appear with 0h / capacity / 0%.
 * Out-of-validity time is retained and flagged.
 */
export type ContractReport = {
  period: AnalyticsPeriod;
  periodKind: ReportingPeriodKind;
  contractUtilizations: ContractUtilization[];
};

/**
 * Hours-by-client report for a period.
 */
export type HoursByClientReport = {
  period: AnalyticsPeriod;
  periodKind: ReportingPeriodKind;
  clientAllocations: ClientAllocation[];
};

/**
 * Annual overview: monthly analytics buckets for each month in a year period.
 */
export type AnnualOverviewReport = {
  period: AnalyticsPeriod;
  periodKind: ReportingPeriodKind;
  months: MonthlyAnalytics[];
};

// ---------------------------------------------------------------------------
// Reporting service
// ---------------------------------------------------------------------------

/**
 * Thin, validated, workspace-scoped reporting query layer (P105-04).
 *
 * Responsibilities:
 * - Accept a validated period request and resolve it into an `AnalyticsPeriod`
 *   using `Workspace.timezone` (BR-105-014).
 * - Orchestrate shared analytics calls — AnalyticsService owns ALL arithmetic.
 * - Fail closed for invalid input (BR-105-010).
 *
 * Non-goals:
 * - No percentage, average, capacity, or utilization arithmetic here.
 * - No pro-rata formula here — it lives in AnalyticsService.
 * - No rollover or expiry semantics (OBD-012 open).
 * - No revenue figures (PD-105-001).
 */
export class ReportingService {
  constructor(private readonly analytics: AnalyticsService) {}

  /**
   * Resolves a period-kind request into an `AnalyticsPeriod` using the
   * workspace timezone (BR-105-014).
   *
   * Fails closed if the period kind is unknown or if a custom range has
   * startDate > endDate.
   */
  resolvePeriod(
    request: PeriodKindRequest,
    timezone: string,
    now: Date = new Date(),
  ): AnalyticsPeriod {
    const VALID_KINDS = new Set(["today", "week", "month", "year", "custom"]);
    if (!request || !VALID_KINDS.has(request.kind)) {
      throw new ReportingError(`Unknown period kind: ${String((request as { kind?: unknown })?.kind)}`);
    }

    if (request.kind === "today") return getTodayPeriod(timezone, now);
    if (request.kind === "week") return getCurrentWeekPeriod(timezone, now);
    if (request.kind === "month") return getCurrentMonthPeriod(timezone, now);
    if (request.kind === "year") return getCurrentYearPeriod(timezone, now);

    // kind === "custom"
    const { startDate, endDate } = request;
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      throw new ReportingError("Custom period requires valid Date values for startDate and endDate");
    }
    const period = getDateRangePeriod(startDate, endDate);
    if (!isValidPeriod(period)) {
      throw new ReportingError("Invalid custom period: startDate must be <= endDate");
    }
    return period;
  }

  /**
   * Returns the contract report for the given period (BR-105-018).
   *
   * Includes all relevant contracts (validity overlap ∪ in-period consumption).
   * All arithmetic is delegated to AnalyticsService / AnalyticsRepository.
   */
  async getContractReport(
    context: WorkspaceContext,
    request: PeriodKindRequest,
    now: Date = new Date(),
  ): Promise<ContractReport> {
    const period = this.resolvePeriod(request, context.timezone, now);
    const contractUtilizations = await this.analytics.getContractUtilizations(
      context,
      period,
    );
    return { period, periodKind: request, contractUtilizations };
  }

  /**
   * Returns hours by client for the given period.
   */
  async getHoursByClient(
    context: WorkspaceContext,
    request: PeriodKindRequest,
    now: Date = new Date(),
  ): Promise<HoursByClientReport> {
    const period = this.resolvePeriod(request, context.timezone, now);
    const clientAllocations = await this.analytics.getClientAllocations(
      context,
      period,
    );
    return { period, periodKind: request, clientAllocations };
  }

  /**
   * Returns monthly analytics buckets for a year period (annual overview).
   * Each bucket is the full-month analytics for that calendar month.
   */
  async getAnnualOverview(
    context: WorkspaceContext,
    year: number,
    now: Date = new Date(),
  ): Promise<AnnualOverviewReport> {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new ReportingError(`Invalid year: ${year}`);
    }

    const period = this.resolvePeriod({ kind: "year" }, context.timezone, now);

    // One monthly analytics call per calendar month Jan–Dec.
    const months: MonthlyAnalytics[] = await Promise.all(
      Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(Date.UTC(year, i, 1));
        const monthEnd = new Date(Date.UTC(year, i + 1, 0)); // last day of month
        return this.analytics.getMonthlyAnalytics(context, {
          startDate: monthStart,
          endDate: monthEnd,
        });
      }),
    );

    return { period, periodKind: { kind: "year" }, months };
  }
}

/**
 * Reporting-specific error for validation and business rule violations.
 */
export class ReportingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportingError";
  }
}
