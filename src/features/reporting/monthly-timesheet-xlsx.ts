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
 * - Sheet 1: Summary (Client, Start, End, Hours)
 * - Sheet 2: Detail (Date, Duration (hours), Description)
 *
 * Operational data only - no financial information.
 * Consumes shared MonthlyTimesheetExportDataset.
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
    buildDetailSheet(dataset),
    "Detail",
  );

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
}

function buildSummarySheet(
  dataset: MonthlyTimesheetExportDataset,
): XLSX.WorkSheet {
  const headers = ["Client", "Start", "End", "Hours"] as const;
  const rows: CellScalar[][] = [
    [
      dataset.clientName,
      formatTimesheetDate(dataset.period.startDate),
      formatTimesheetDate(dataset.period.endDate),
      formatTimesheetHours(dataset.totalMinutes),
    ],
  ];

  const sheet = XLSX.utils.aoa_to_sheet([Array.from(headers), ...rows]);
  sheet["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  return sheet;
}

function buildDetailSheet(
  dataset: MonthlyTimesheetExportDataset,
): XLSX.WorkSheet {
  const headers = ["Date", "Duration (hours)", "Description"] as const;
  const rows: CellScalar[][] = [];

  for (const day of dataset.dailyBreakdown) {
    for (const entry of day.entries) {
      rows.push([
        formatTimesheetDateItalian(day.workDate),
        formatTimesheetHours(entry.durationMinutes),
        entry.description ?? "",
      ]);
    }
  }

  const sheet = XLSX.utils.aoa_to_sheet([Array.from(headers), ...rows]);
  sheet["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 60 }];
  return sheet;
}

function formatTimesheetDateItalian(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}
