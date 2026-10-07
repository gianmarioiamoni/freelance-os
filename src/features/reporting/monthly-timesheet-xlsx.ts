// src/features/reporting/monthly-timesheet-xlsx.ts
import "server-only";

import * as XLSX from "xlsx";

import type { MonthlyTimesheetExportDataset } from "@/features/reporting/monthly-timesheet-export";
import {
  formatTimesheetDate,
  formatTimesheetHours,
} from "@/features/reporting/monthly-timesheet-export";

type CellScalar = string | number | boolean | null;

/**
 * Monthly Timesheet Excel serializer (R2.2-STABILIZATION-06).
 *
 * Workbook structure:
 * - Sheet 1: Summary
 * - Sheet 2: Daily Breakdown
 * - Sheet 3: Entry Detail
 *
 * Consumes shared MonthlyTimesheetExportDataset.
 * No billing recalculation. No currency mixing.
 */
export function serializeMonthlyTimesheetXlsx(
  dataset: MonthlyTimesheetExportDataset,
): Buffer {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    buildSummarySheet(dataset),
    "Summary",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildDailySheet(dataset),
    "Daily",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildEntriesSheet(dataset),
    "Entries",
  );

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
}

function buildSummarySheet(
  dataset: MonthlyTimesheetExportDataset,
): XLSX.WorkSheet {
  const rows: CellScalar[][] = [
    ["Monthly Timesheet Summary"],
    [],
    ["Client", dataset.clientName],
    ["Period Start", formatTimesheetDate(dataset.period.startDate)],
    ["Period End", formatTimesheetDate(dataset.period.endDate)],
    [],
    ["Total Hours", formatTimesheetHours(dataset.totalMinutes)],
    ["Billable Hours", formatTimesheetHours(dataset.billableMinutes)],
    [],
    ["Amount to Invoice"],
  ];

  if (dataset.accrued.byCurrency.length === 0) {
    rows.push(["No billable work"]);
  } else {
    for (const row of dataset.accrued.byCurrency) {
      rows.push([row.currency, row.published]);
    }
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 20 }, { wch: 20 }];
  return sheet;
}

function buildDailySheet(
  dataset: MonthlyTimesheetExportDataset,
): XLSX.WorkSheet {
  const headers = ["Date", "Total Hours", "Billable Hours"] as const;
  const rows: CellScalar[][] = [];

  for (const day of dataset.dailyBreakdown) {
    rows.push([
      formatTimesheetDate(day.workDate),
      formatTimesheetHours(day.totalMinutes),
      formatTimesheetHours(day.billableMinutes),
    ]);
  }

  const sheet = XLSX.utils.aoa_to_sheet([Array.from(headers), ...rows]);
  sheet["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }];
  return sheet;
}

function buildEntriesSheet(
  dataset: MonthlyTimesheetExportDataset,
): XLSX.WorkSheet {
  const headers = ["Date", "Duration", "Billable", "Description"] as const;
  const rows: CellScalar[][] = [];

  for (const day of dataset.dailyBreakdown) {
    for (const entry of day.entries) {
      rows.push([
        formatTimesheetDate(day.workDate),
        formatTimesheetHours(entry.durationMinutes),
        entry.billable ? "Yes" : "No",
        entry.description ?? "",
      ]);
    }
  }

  const sheet = XLSX.utils.aoa_to_sheet([Array.from(headers), ...rows]);
  sheet["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 50 }];
  return sheet;
}
