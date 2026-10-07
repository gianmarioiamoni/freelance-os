// src/features/reporting/report-xlsx.ts
import "server-only";

import * as XLSX from "xlsx";

import type {
  ContractReport,
  HoursByClientReport,
  RevenueOverview,
} from "@/application/reporting/reporting-service";
import { allocationByContractId } from "@/features/reporting/report-allocation-display";
import { getCalendarDateKey } from "@/lib/analytics-periods";

export type ReportXlsxSource = {
  revenueOverview: RevenueOverview;
  hoursByClient: HoursByClientReport;
  contractReport: ContractReport;
};

type CellScalar = string | number | boolean | null;

const AMOUNT_NUMBER_FORMAT = "#,##0.00";
const SHEET_NAMES = ["Revenue", "HoursByClient", "ContractReport"] as const;

/**
 * Server-only XLSX of the approved reporting datasets.
 *
 * Sheets (deterministic order): Revenue, HoursByClient, ContractReport.
 * Values come from already-computed reporting DTOs — no recalculation.
 * Currencies stay per-row; no mixed-currency total and no FX.
 */
export function serializeReportXlsx(source: ReportXlsxSource): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    buildRevenueSheet(source.revenueOverview),
    SHEET_NAMES[0],
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildHoursByClientSheet(source.hoursByClient),
    SHEET_NAMES[1],
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildContractReportSheet(source.contractReport),
    SHEET_NAMES[2],
  );

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
}

export function reportXlsxFilename(
  report: Pick<ContractReport, "period" | "periodKind">,
): string {
  const kind = sanitizeFilenameToken(report.periodKind.kind);
  const start = getCalendarDateKey(report.period.startDate);
  const end = getCalendarDateKey(report.period.endDate);
  return `reports-${kind}-${start}-${end}.xlsx`;
}

export function createReportXlsxResponse(
  buffer: Buffer,
  filename: string,
): Response {
  const safeName = sanitizeFilenameToken(filename) || "reports.xlsx";
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}"`,
    },
  });
}

function buildRevenueSheet(overview: RevenueOverview): XLSX.WorkSheet {
  const headers = ["metric", "currency", "amount"] as const;
  const rows: CellScalar[][] = [];

  for (const row of overview.accrued.byCurrency) {
    rows.push(["accrued", row.currency, row.published]);
  }
  for (const row of overview.expected.byCurrency) {
    rows.push(["expected", row.currency, row.published]);
  }
  if (overview.forecast) {
    for (const row of overview.forecast.byCurrency) {
      rows.push(["forecast", row.currency, row.published]);
    }
  }
  for (const row of overview.invoiced) {
    rows.push(["invoiced", row.currency, parseAmount(row.amount)]);
  }
  for (const row of overview.paid) {
    rows.push(["paid", row.currency, parseAmount(row.amount)]);
  }
  for (const row of overview.outstanding) {
    rows.push(["outstanding", row.currency, parseAmount(row.amount)]);
  }

  return finalizeSheet(headers, rows, {
    columnWidths: [14, 10, 14],
    amountColumns: [2],
  });
}

function buildHoursByClientSheet(report: HoursByClientReport): XLSX.WorkSheet {
  const headers = [
    "client_name",
    "is_archived",
    "total_minutes",
    "billable_minutes",
    "share_percent",
  ] as const;
  const rows: CellScalar[][] = report.clientAllocations.map((row) => [
    row.clientName,
    row.isArchived,
    row.totalMinutes,
    row.billableMinutes,
    row.percentage,
  ]);

  return finalizeSheet(headers, rows, {
    columnWidths: [24, 12, 14, 16, 14],
  });
}

function buildContractReportSheet(report: ContractReport): XLSX.WorkSheet {
  const allocations = allocationByContractId(report.contractAllocations);
  const headers = [
    "client_name",
    "is_archived",
    "is_ongoing",
    "is_out_of_validity",
    "consumed_minutes",
    "capacity_minutes",
    "utilization_percent",
    "allocated_minutes",
    "allocation_consumed_minutes",
    "remaining_minutes",
    "allocation_status",
  ] as const;

  const rows: CellScalar[][] = report.contractUtilizations.map((utilization) => {
    const allocation = allocations.get(utilization.contractId);
    const allocationConfigured =
      allocation !== undefined && allocation.allocatedMinutes !== null
        ? allocation
        : undefined;

    return [
      utilization.clientName,
      utilization.isArchived,
      utilization.isOngoing,
      utilization.isOutOfValidity,
      utilization.consumedMinutes,
      utilization.contractedMinutes,
      utilization.utilizationPercentage,
      allocationConfigured?.allocatedMinutes ?? null,
      allocationConfigured?.consumedMinutes ?? null,
      allocationConfigured?.remainingMinutes ?? null,
      allocationConfigured?.allocationStatus ?? null,
    ];
  });

  return finalizeSheet(headers, rows, {
    columnWidths: [24, 12, 12, 16, 16, 16, 18, 16, 24, 16, 18],
  });
}

function finalizeSheet(
  headers: readonly string[],
  rows: readonly CellScalar[][],
  options: {
    columnWidths: readonly number[];
    amountColumns?: readonly number[];
  },
): XLSX.WorkSheet {
  const aoa: CellScalar[][] = [
    [...headers],
    ...rows.map((row) => row.map((value) => (value === null ? "" : value))),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const lastRow = Math.max(aoa.length, 1);
  const lastCol = XLSX.utils.encode_col(headers.length - 1);

  sheet["!cols"] = options.columnWidths.map((wch) => ({ wch }));
  sheet["!autofilter"] = { ref: `A1:${lastCol}${lastRow}` };

  for (const colIndex of options.amountColumns ?? []) {
    for (let rowIndex = 1; rowIndex < aoa.length; rowIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      const cell = sheet[address];
      if (cell && cell.t === "n") {
        cell.z = AMOUNT_NUMBER_FORMAT;
      }
    }
  }

  return sheet;
}

function parseAmount(value: string): number | string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function sanitizeFilenameToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "");
}
