// src/application/analytics/analytics-service.ts
import type { 
  AccruedRevenue,
  AccruedTimeEntryFact,
  AnalyticsPeriod, 
  MonthlyAnalytics, 
  DailyAnalytics,
  WeeklyAnalytics,
  ClientAllocation,
  ContractUtilization,
  ExpectedContractFact,
  ExpectedRevenue,
} from "@/domain/analytics-types";
import type { AnalyticsRepository, WorkspaceMemberRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import {
  calculateAccruedRevenue,
  publishMonetaryAmount,
} from "@/application/analytics/accrued-revenue";
import { calculateExpectedRevenue } from "@/application/analytics/expected-revenue";
import { getCurrentMonthPeriod, getPeriodDays, isValidPeriod } from "@/lib/analytics-periods";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

/**
 * Shared analytics calculation service providing deterministic analytics for dashboard,
 * reporting, alerts, and AI queries per EPIC-104 / R2-E01.
 * 
 * All calculations:
 * - Are workspace-scoped (BR-104-001)
 * - Include archived client data per PD-104-001
 * - Use ALL tracked time for contract utilization per PD-104-002
 * - Use integer minutes for precision (BR-104-010)
 * - Handle zero denominators gracefully (BR-104-011)
 * 
 * P105-02: Service-level workspace membership guard added (F-104-014).
 */
export class AnalyticsService {
  constructor(
    private analytics: AnalyticsRepository,
    private members: WorkspaceMemberRepository,
  ) {}

  /**
   * Verifies workspace membership for the analytics request.
   * Fails closed if the caller is not a member of the target workspace.
   * P105-02: Service-level guard per F-104-014.
   */
  private async requireMembership(context: WorkspaceContext): Promise<void> {
    const membership = await this.members.getMember(context.workspaceId, context.userId);
    if (!membership) {
      throw new UnauthorizedWorkspaceAccessError();
    }
  }

  /**
   * Gets monthly analytics for the current month (default per PD-104-003)
   */
  async getCurrentMonthAnalytics(context: WorkspaceContext): Promise<MonthlyAnalytics> {
    await this.requireMembership(context);
    // BR-105-014: resolve "today" from workspace timezone, not the server clock.
    // BR-105-015: current month ends today, not the last day of the month.
    const period = getCurrentMonthPeriod(context.timezone);
    return this.getMonthlyAnalytics(context, period);
  }

  /**
   * Gets monthly analytics for a specific period
   */
  async getMonthlyAnalytics(
    context: WorkspaceContext, 
    period: AnalyticsPeriod
  ): Promise<MonthlyAnalytics> {
    await this.requireMembership(context);
    
    if (!isValidPeriod(period)) {
      throw new AnalyticsError("Invalid period: start date must be <= end date");
    }

    const [hours, entries, contracts] = await Promise.all([
      this.analytics.getMonthlyAnalytics(context.workspaceId, period),
      this.analytics.listTimeEntriesForPeriod(context.workspaceId, period),
      this.analytics.listExpectedContracts(context.workspaceId, period),
    ]);

    return {
      ...hours,
      accrued: AnalyticsService.calculateAccruedRevenue(
        period,
        entries,
        context.timezone,
      ),
      expected: AnalyticsService.calculateExpectedRevenue(
        period,
        contracts,
        context.timezone,
      ),
    };
  }

  /**
   * Gets daily analytics breakdown for a period
   */
  async getDailyAnalytics(
    context: WorkspaceContext,
    period: AnalyticsPeriod
  ): Promise<DailyAnalytics[]> {
    await this.requireMembership(context);
    
    if (!isValidPeriod(period)) {
      throw new AnalyticsError("Invalid period: start date must be <= end date");
    }

    return await this.analytics.getDailyAnalytics(context.workspaceId, period);
  }

  /**
   * Gets weekly analytics for a period by composing daily analytics rows (F-104-013).
   * Weekly totals are the arithmetic sum of all daily rows within the period.
   * Reuses getDailyAnalytics so no new SQL or repository method is needed.
   * BR-105-014: the period must be resolved against Workspace.timezone before calling.
   */
  async getWeeklyAnalytics(
    context: WorkspaceContext,
    period: AnalyticsPeriod
  ): Promise<WeeklyAnalytics> {
    await this.requireMembership(context);

    if (!isValidPeriod(period)) {
      throw new AnalyticsError("Invalid period: start date must be <= end date");
    }

    const days = await this.analytics.getDailyAnalytics(context.workspaceId, period);

    const totalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0);
    const billableMinutes = days.reduce((sum, d) => sum + d.billableMinutes, 0);
    const nonBillableMinutes = days.reduce((sum, d) => sum + d.nonBillableMinutes, 0);

    return {
      period,
      totalMinutes,
      billableMinutes,
      nonBillableMinutes,
      billablePercentage: AnalyticsService.calculateBillablePercentage(billableMinutes, totalMinutes),
      days,
    };
  }

  /**
   * Gets client allocation breakdown for a period
   * Includes archived clients per PD-104-001
   */
  async getClientAllocations(
    context: WorkspaceContext,
    period: AnalyticsPeriod
  ): Promise<ClientAllocation[]> {
    await this.requireMembership(context);
    
    if (!isValidPeriod(period)) {
      throw new AnalyticsError("Invalid period: start date must be <= end date");
    }

    return await this.analytics.getClientAllocations(context.workspaceId, period);
  }

  /**
   * Gets contract utilization for a period
   * Uses ALL tracked time (billable + non-billable) per PD-104-002
   */
  async getContractUtilizations(
    context: WorkspaceContext,
    period: AnalyticsPeriod
  ): Promise<ContractUtilization[]> {
    await this.requireMembership(context);
    
    if (!isValidPeriod(period)) {
      throw new AnalyticsError("Invalid period: start date must be <= end date");
    }

    return await this.analytics.getContractUtilizations(context.workspaceId, period);
  }

  /**
   * Authoritative Accrued Revenue for a resolved AnalyticsPeriod.
   * Uses TimeEntry quantity + historical commercial snapshot only.
   * Independent of Expected, Forecast, Invoice, and Payment.
   */
  async getAccruedRevenue(
    context: WorkspaceContext,
    period: AnalyticsPeriod,
  ): Promise<AccruedRevenue> {
    await this.requireMembership(context);

    if (!isValidPeriod(period)) {
      throw new AnalyticsError("Invalid period: start date must be <= end date");
    }

    const entries = await this.analytics.listTimeEntriesForPeriod(
      context.workspaceId,
      period,
    );

    return AnalyticsService.calculateAccruedRevenue(
      period,
      entries,
      context.timezone,
    );
  }

  /**
   * Authoritative Expected Revenue for a resolved AnalyticsPeriod.
   * Uses live Contract commercial configuration + PD-105-005 pro-rata only.
   * Independent of TimeEntry, Accrued, Forecast, Invoice, and Payment.
   */
  async getExpectedRevenue(
    context: WorkspaceContext,
    period: AnalyticsPeriod,
  ): Promise<ExpectedRevenue> {
    await this.requireMembership(context);

    if (!isValidPeriod(period)) {
      throw new AnalyticsError("Invalid period: start date must be <= end date");
    }

    const contracts = await this.analytics.listExpectedContracts(
      context.workspaceId,
      period,
    );

    return AnalyticsService.calculateExpectedRevenue(
      period,
      contracts,
      context.timezone,
    );
  }

  /**
   * Pure Accrued calculation. Exposed for unit tests and later consumers.
   * `timezone` is the workspace IANA zone that resolved `period`.
   */
  static calculateAccruedRevenue(
    period: AnalyticsPeriod,
    entries: readonly AccruedTimeEntryFact[],
    timezone: string,
  ): AccruedRevenue {
    return calculateAccruedRevenue(period, entries, timezone);
  }

  /**
   * Pure Expected calculation. Exposed for unit tests and later consumers.
   * `timezone` is the workspace IANA zone that resolved `period`.
   */
  static calculateExpectedRevenue(
    period: AnalyticsPeriod,
    contracts: readonly ExpectedContractFact[],
    timezone: string,
  ): ExpectedRevenue {
    return calculateExpectedRevenue(
      period,
      contracts,
      timezone,
      AnalyticsService.calculateProRataCapacity,
    );
  }

  /**
   * R2-OD-002: round a published monetary figure once from the unrounded total.
   */
  static publishMonetaryAmount(unrounded: number): number {
    return publishMonetaryAmount(unrounded);
  }

  /**
   * Calculates billable percentage from minutes.
   * Returns null for zero denominator per BR-104-011, BR-104-012.
   * P105-02: Shared calculation, called from repository and components.
   */
  static calculateBillablePercentage(billableMinutes: number, totalMinutes: number): number | null {
    if (totalMinutes === 0) {
      return null;
    }
    return (billableMinutes / totalMinutes) * 100;
  }

  /**
   * Calculates allocation percentage (part / total).
   * Returns null for zero denominator.
   * P105-02: Shared calculation for client allocation percentages.
   */
  static calculateAllocationPercentage(partMinutes: number, totalMinutes: number): number | null {
    if (totalMinutes === 0) {
      return null;
    }
    return (partMinutes / totalMinutes) * 100;
  }

  /**
   * Calculates utilization percentage from consumed and contracted minutes.
   * Returns null for unlimited contracts per PD-104-004.
   * P105-02: Shared calculation, called from repository.
   */
  static calculateUtilizationPercentage(
    consumedMinutes: number, 
    contractedMinutes: number | null
  ): number | null {
    if (contractedMinutes === null || contractedMinutes === 0) {
      return null;
    }
    return (consumedMinutes / contractedMinutes) * 100;
  }

  /**
   * Calculates daily average from total minutes and period length.
   * P105-02: Replaces hardcoded /30 divisor (F-104-001).
   */
  static calculateDailyAverage(totalMinutes: number, period: AnalyticsPeriod): number {
    const days = getPeriodDays(period);
    return Math.round(totalMinutes / days);
  }

  /**
   * Formats minutes as hours and minutes for display
   */
  static formatDuration(minutes: number): string {
    if (minutes === 0) {
      return "0h";
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Formats percentage for display
   */
  static formatPercentage(percentage: number | null): string {
    if (percentage === null) {
      return "—";
    }
    return `${Math.round(percentage)}%`;
  }

  /**
   * Determines if a contract is ongoing.
   * BR-105-016: ongoing ≡ validTo === null. Independent from capacity.
   * @deprecated Use validTo === null directly. This helper exists for
   *   backward compatibility; callers should prefer the direct check.
   */
  static isOngoingUtilization(validTo: Date | null): boolean {
    return validTo === null;
  }

  /**
   * Calculates pro-rated contractual capacity for a reporting period (BR-105-017).
   *
   * Formula:
   *   overlapDays = max(0, min(periodEnd, contractEffectiveEnd) − max(periodStart, validFrom) + 1)
   *   proRataMinutes = monthlyContractedMinutes × (overlapDays / periodDays)
   *
   * Boundary convention: [validFrom, validTo) — validTo is exclusive.
   * When validTo is null the contract is ongoing; its effective end is treated as
   * one day past the period end, so the overlap is always the full period (or
   * whatever portion follows validFrom).
   *
   * Returns null when monthlyContractedMinutes is null — no denominator is invented.
   * No rollover, carry-over, or expiry semantics are applied (OBD-012 open).
   *
   * @param monthlyContractedMinutes - Monthly capacity in minutes, or null.
   * @param validFrom                - Contract validity start (inclusive).
   * @param validTo                  - Contract validity end (exclusive). null = ongoing.
   * @param period                   - The reporting period.
   */
  static calculateProRataCapacity(
    monthlyContractedMinutes: number | null,
    validFrom: Date,
    validTo: Date | null,
    period: AnalyticsPeriod,
  ): number | null {
    if (monthlyContractedMinutes === null) {
      return null;
    }

    const periodDays = getPeriodDays(period);

    // [validFrom, validTo) — validTo is exclusive, so the last inclusive day is validTo − 1.
    // When validTo is null the contract never ends; effective inclusive end = periodEnd.
    const contractInclusiveEnd =
      validTo === null
        ? period.endDate
        : new Date(validTo.getTime() - 24 * 60 * 60 * 1000); // validTo − 1 day

    const overlapStart = period.startDate > validFrom ? period.startDate : validFrom;
    const overlapEnd = period.endDate < contractInclusiveEnd ? period.endDate : contractInclusiveEnd;

    const overlapDays = overlapEnd >= overlapStart
      ? Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;

    if (overlapDays <= 0) {
      return 0;
    }

    return (monthlyContractedMinutes * overlapDays) / periodDays;
  }
}

/**
 * Analytics-specific error for validation and business rule violations
 */
export class AnalyticsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsError";
  }
}