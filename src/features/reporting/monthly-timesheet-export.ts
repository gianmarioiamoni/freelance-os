// src/features/reporting/monthly-timesheet-export.ts
import type { MonthlyTimesheetReport } from "@/application/reporting/reporting-service";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { getCalendarDateKey } from "@/lib/analytics-periods";

/**
 * Shared Monthly Timesheet export dataset (R2.2-STABILIZATION-06).
 *
 * ONE authoritative dataset consumed by CSV, Excel, and PDF.
 * Reuses existing MonthlyTimesheetReport DTO from ReportingService.
 * No billing recalculation. No currency mixing. No FX.
 *
 * This is the single source of truth for all Monthly Timesheet exports,
 * ensuring UI and exports show identical data.
 */
export type MonthlyTimesheetExportDataset = MonthlyTimesheetReport;

/**
 * Export dataset display helpers.
 * These format values for human-readable export output.
 * They do NOT recalculate business logic.
 */
export function formatTimesheetHours(minutes: number): string {
  return AnalyticsService.formatDuration(minutes);
}

export function formatTimesheetDate(date: Date): string {
  return getCalendarDateKey(date);
}

export function formatTimesheetCurrency(
  byCurrency: readonly { currency: string; published: number }[],
): string {
  if (byCurrency.length === 0) {
    return "-";
  }
  return byCurrency.map((row) => `${row.published} ${row.currency}`).join(", ");
}

/**
 * Monthly Timesheet export filename.
 */
export function monthlyTimesheetFilename(
  report: MonthlyTimesheetExportDataset,
  extension: string,
): string {
  const clientSlug = sanitizeFilenameToken(report.clientName);
  const start = getCalendarDateKey(report.period.startDate);
  const end = getCalendarDateKey(report.period.endDate);
  return `timesheet-${clientSlug}-${start}-${end}.${extension}`;
}

function sanitizeFilenameToken(value: string | undefined | null): string {
  if (!value) return "unknown";
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
