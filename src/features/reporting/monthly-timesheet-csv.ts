// src/features/reporting/monthly-timesheet-csv.ts
import type { MonthlyTimesheetExportDataset } from "@/features/reporting/monthly-timesheet-export";
import {
  formatTimesheetDate,
  formatTimesheetHours,
} from "@/features/reporting/monthly-timesheet-export";
import { serializeCsv, type CsvValue } from "@/lib/csv";

/**
 * Monthly Timesheet CSV serializer (R2.2-STABILIZATION-06).
 *
 * Logical structure:
 * - metadata
 * - summary
 * - accrued by currency
 * - daily breakdown
 * - entry detail
 *
 * Consumes shared MonthlyTimesheetExportDataset.
 * No billing recalculation. No currency mixing.
 */
export function serializeMonthlyTimesheetCsv(
  dataset: MonthlyTimesheetExportDataset,
): string {
  return serializeCsv(
    joinSections([
      metaSection(dataset),
      summarySection(dataset),
      accruedSection(dataset),
      dailySection(dataset),
      entriesSection(dataset),
    ]),
  );
}

function metaSection(dataset: MonthlyTimesheetExportDataset): CsvValue[][] {
  return [
    ["section", "meta"],
    ["period_start", "period_end", "client_id", "client_name"],
    [
      formatTimesheetDate(dataset.period.startDate),
      formatTimesheetDate(dataset.period.endDate),
      dataset.clientId,
      dataset.clientName,
    ],
  ];
}

function summarySection(dataset: MonthlyTimesheetExportDataset): CsvValue[][] {
  return [
    ["section", "summary"],
    ["metric", "value"],
    ["total_hours", formatTimesheetHours(dataset.totalMinutes)],
    ["billable_hours", formatTimesheetHours(dataset.billableMinutes)],
  ];
}

function accruedSection(dataset: MonthlyTimesheetExportDataset): CsvValue[][] {
  const rows: CsvValue[][] = [
    ["section", "accrued"],
    ["currency", "amount"],
  ];

  for (const row of dataset.accrued.byCurrency) {
    rows.push([row.currency, row.published]);
  }

  if (dataset.accrued.byCurrency.length === 0) {
    rows.push(["-", 0]);
  }

  return rows;
}

function dailySection(dataset: MonthlyTimesheetExportDataset): CsvValue[][] {
  const rows: CsvValue[][] = [
    ["section", "daily_breakdown"],
    ["date", "total_hours", "billable_hours"],
  ];

  for (const day of dataset.dailyBreakdown) {
    rows.push([
      formatTimesheetDate(day.workDate),
      formatTimesheetHours(day.totalMinutes),
      formatTimesheetHours(day.billableMinutes),
    ]);
  }

  return rows;
}

function entriesSection(dataset: MonthlyTimesheetExportDataset): CsvValue[][] {
  const rows: CsvValue[][] = [
    ["section", "entries"],
    ["date", "duration", "billable", "description"],
  ];

  for (const day of dataset.dailyBreakdown) {
    for (const entry of day.entries) {
      rows.push([
        formatTimesheetDate(day.workDate),
        formatTimesheetHours(entry.durationMinutes),
        entry.billable ? "yes" : "no",
        entry.description ?? "",
      ]);
    }
  }

  return rows;
}

function joinSections(sections: CsvValue[][][]): CsvValue[][] {
  const result: CsvValue[][] = [];
  for (const section of sections) {
    if (result.length > 0) {
      result.push([]);
    }
    result.push(...section);
  }
  return result;
}
