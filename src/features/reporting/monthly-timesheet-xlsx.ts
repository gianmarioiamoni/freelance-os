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
  const startDate = formatTimesheetDateItalian(dataset.period.startDate);
  const endDate = formatTimesheetDateItalian(dataset.period.endDate);
  
  // Build sheet data with title, period, table and total
  const data: CellScalar[][] = [];
  
  // Row 1: Title
  data.push(["Monthly Timesheet Summary", null, null, null]);
  
  // Row 2: Period
  data.push([`${startDate} — ${endDate}`, null, null, null]);
  
  // Row 3: Empty row for spacing
  data.push([null, null, null, null]);
  
  // Row 4: Table headers
  data.push(["Client", "Start", "End", "Hours"]);
  
  // Row 5+: Data rows
  data.push([
    dataset.clientName,
    startDate,
    endDate,
    formatTimesheetHours(dataset.totalMinutes),
  ]);
  
  // Add total row
  const totalRow = data.length + 1; // 1-indexed
  data.push(["Total Hours", null, null, formatTimesheetHours(dataset.totalMinutes)]);
  
  const sheet = XLSX.utils.aoa_to_sheet(data);
  
  // Column widths
  sheet["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
  
  // Define cell styles
  const titleStyle = {
    font: { bold: true, sz: 14 },
    alignment: { horizontal: "left" as const, vertical: "center" as const },
  };
  
  const periodStyle = {
    font: { sz: 11 },
    alignment: { horizontal: "left" as const, vertical: "center" as const },
  };
  
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4472C4" }, patternType: "solid" as const },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
    border: {
      top: { style: "thin" as const, color: { rgb: "000000" } },
      bottom: { style: "thin" as const, color: { rgb: "000000" } },
      left: { style: "thin" as const, color: { rgb: "000000" } },
      right: { style: "thin" as const, color: { rgb: "000000" } },
    },
  };
  
  const dataCellStyle = {
    alignment: { horizontal: "left" as const, vertical: "center" as const },
    border: {
      top: { style: "thin" as const, color: { rgb: "D0D0D0" } },
      bottom: { style: "thin" as const, color: { rgb: "D0D0D0" } },
      left: { style: "thin" as const, color: { rgb: "D0D0D0" } },
      right: { style: "thin" as const, color: { rgb: "D0D0D0" } },
    },
  };
  
  const dataNumberStyle = {
    alignment: { horizontal: "right" as const, vertical: "center" as const },
    border: {
      top: { style: "thin" as const, color: { rgb: "D0D0D0" } },
      bottom: { style: "thin" as const, color: { rgb: "D0D0D0" } },
      left: { style: "thin" as const, color: { rgb: "D0D0D0" } },
      right: { style: "thin" as const, color: { rgb: "D0D0D0" } },
    },
  };
  
  const totalLabelStyle = {
    font: { bold: true },
    alignment: { horizontal: "left" as const, vertical: "center" as const },
    border: {
      top: { style: "medium" as const, color: { rgb: "000000" } },
      bottom: { style: "thin" as const, color: { rgb: "000000" } },
      left: { style: "thin" as const, color: { rgb: "000000" } },
      right: { style: "thin" as const, color: { rgb: "000000" } },
    },
  };
  
  const totalValueStyle = {
    font: { bold: true },
    alignment: { horizontal: "right" as const, vertical: "center" as const },
    border: {
      top: { style: "medium" as const, color: { rgb: "000000" } },
      bottom: { style: "thin" as const, color: { rgb: "000000" } },
      left: { style: "thin" as const, color: { rgb: "000000" } },
      right: { style: "thin" as const, color: { rgb: "000000" } },
    },
  };
  
  // Apply title style (A1)
  if (sheet["A1"]) sheet["A1"].s = titleStyle;
  
  // Apply period style (A2)
  if (sheet["A2"]) sheet["A2"].s = periodStyle;
  
  // Apply header styles (Row 4: A4, B4, C4, D4)
  if (sheet["A4"]) sheet["A4"].s = headerStyle;
  if (sheet["B4"]) sheet["B4"].s = headerStyle;
  if (sheet["C4"]) sheet["C4"].s = headerStyle;
  if (sheet["D4"]) sheet["D4"].s = { ...headerStyle, alignment: { horizontal: "center" as const, vertical: "center" as const } };
  
  // Apply data row styles (Row 5: A5, B5, C5, D5)
  if (sheet["A5"]) sheet["A5"].s = dataCellStyle;
  if (sheet["B5"]) sheet["B5"].s = dataCellStyle;
  if (sheet["C5"]) sheet["C5"].s = dataCellStyle;
  if (sheet["D5"]) sheet["D5"].s = dataNumberStyle;
  
  // Apply total row styles (Row 6: A6, D6)
  if (sheet["A6"]) sheet["A6"].s = totalLabelStyle;
  if (sheet["B6"]) sheet["B6"].s = { ...totalLabelStyle, border: { ...totalLabelStyle.border, left: { style: "thin" as const, color: { rgb: "FFFFFF" } }, right: { style: "thin" as const, color: { rgb: "FFFFFF" } } } };
  if (sheet["C6"]) sheet["C6"].s = { ...totalLabelStyle, border: { ...totalLabelStyle.border, left: { style: "thin" as const, color: { rgb: "FFFFFF" } }, right: { style: "thin" as const, color: { rgb: "FFFFFF" } } } };
  if (sheet["D6"]) sheet["D6"].s = totalValueStyle;
  
  // Set freeze panes at row 5 (after headers)
  sheet["!freeze"] = { xSplit: 0, ySplit: 4 };
  
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
  
  // Column widths
  sheet["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 60 }];
  
  // Apply header formatting
  if (sheet["A1"]) sheet["A1"].s = { font: { bold: true }, alignment: { horizontal: "left" } };
  if (sheet["B1"]) sheet["B1"].s = { font: { bold: true }, alignment: { horizontal: "right" } };
  if (sheet["C1"]) sheet["C1"].s = { font: { bold: true }, alignment: { horizontal: "left" } };
  
  // Apply data cell alignment for duration column
  for (let i = 2; i <= rows.length + 1; i++) {
    const cellRef = `B${i}`;
    if (sheet[cellRef]) {
      sheet[cellRef].s = { alignment: { horizontal: "right" } };
    }
  }
  
  return sheet;
}

function formatTimesheetDateItalian(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}
