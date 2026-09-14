// src/application/analytics/analytics-service.ts
import type { 
  AnalyticsPeriod, 
  MonthlyAnalytics, 
  DailyAnalytics,
  ClientAllocation,
  ContractUtilization,
} from "@/domain/analytics-types";
import type { AnalyticsRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { getCurrentMonthPeriod, isValidPeriod } from "@/lib/analytics-periods";

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
 */
export class AnalyticsService {
  constructor(private analytics: AnalyticsRepository) {}

  /**
   * Gets monthly analytics for the current month (default per PD-104-003)
   */
  async getCurrentMonthAnalytics(context: WorkspaceContext): Promise<MonthlyAnalytics> {
    const period = getCurrentMonthPeriod();
    return this.getMonthlyAnalytics(context, period);
  }

  /**
   * Gets monthly analytics for a specific period
   */
  async getMonthlyAnalytics(
    context: WorkspaceContext, 
    period: AnalyticsPeriod
  ): Promise<MonthlyAnalytics> {
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
    if (!isValidPeriod(period)) {
      throw new AnalyticsError("Invalid period: start date must be <= end date");
    }

    return await this.analytics.getContractUtilizations(context.workspaceId, period);
  }

  /**
   * Calculates billable percentage from minutes
   * Returns null for zero denominator per BR-104-011, BR-104-012
   */
  static calculateBillablePercentage(billableMinutes: number, totalMinutes: number): number | null {
    if (totalMinutes === 0) {
      return null;
    }
    return (billableMinutes / totalMinutes) * 100;
  }

  /**
   * Calculates utilization percentage from consumed and contracted minutes
   * Returns null for unlimited contracts per PD-104-004
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