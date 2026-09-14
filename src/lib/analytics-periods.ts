// src/lib/analytics-periods.ts
import type { AnalyticsPeriod } from "@/domain/analytics-types";

/**
 * Creates a period for the current month (default dashboard period per PD-104-003)
 */
export function getCurrentMonthPeriod(): AnalyticsPeriod {
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
  
  return {
    startDate,
    endDate,
  };
}

/**
 * Creates a period for a specific month and year
 */
export function getMonthPeriod(year: number, month: number): AnalyticsPeriod {
  // month is 1-based (January = 1)
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));
  
  return {
    startDate,
    endDate,
  };
}

/**
 * Creates a period for a specific date range (inclusive)
 */
export function getDateRangePeriod(startDate: Date, endDate: Date): AnalyticsPeriod {
  return {
    startDate: new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())),
    endDate: new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())),
  };
}

/**
 * Validates that a period has a valid date range
 */
export function isValidPeriod(period: AnalyticsPeriod): boolean {
  return period.startDate <= period.endDate;
}

/**
 * Checks if a date falls within the given period (inclusive)
 */
export function isDateInPeriod(date: Date, period: AnalyticsPeriod): boolean {
  const dateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  return dateOnly >= period.startDate && dateOnly <= period.endDate;
}

/**
 * Gets the number of days in a period
 */
export function getPeriodDays(period: AnalyticsPeriod): number {
  const timeDiff = period.endDate.getTime() - period.startDate.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive end date
}

/**
 * Formats a period for display (e.g., "September 2026")
 */
export function formatPeriodDisplay(period: AnalyticsPeriod): string {
  const startMonth = period.startDate.getMonth();
  const startYear = period.startDate.getFullYear();
  const endMonth = period.endDate.getMonth();
  const endYear = period.endDate.getFullYear();
  
  // If it's a full month period
  const isFullMonth = 
    period.startDate.getDate() === 1 &&
    period.endDate.getDate() === new Date(endYear, endMonth + 1, 0).getDate() &&
    startMonth === endMonth &&
    startYear === endYear;
    
  if (isFullMonth) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[startMonth]} ${startYear}`;
  }
  
  // Otherwise show date range
  return `${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}`;
}