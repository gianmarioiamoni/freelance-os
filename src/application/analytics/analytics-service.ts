// src/application/analytics/analytics-service.ts
import type { 
  AnalyticsPeriod, 
  MonthlyAnalytics, 
  DailyAnalytics,
  ClientAllocation,
  ContractUtilization,
} from "@/domain/analytics-types";
import type { AnalyticsRepository, WorkspaceMemberRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { getCurrentMonthPeriod, getPeriodDays, isValidPeriod } from "@/lib/analytics-periods";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

/**
 * Shared analytics calculation service providing deterministic analytics for dashboard,
 * future reporting, alerts, and AI queries per EPIC-104 requirements.
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

    return await this.analytics.getMonthlyAnalytics(context.workspaceId, period);
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
   * Determines if a contract utilization should show as "Ongoing"
   * per PD-104-004 (contracts with validTo = null)
   */
  static isOngoingUtilization(contractedMinutes: number | null): boolean {
    return contractedMinutes === null;
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