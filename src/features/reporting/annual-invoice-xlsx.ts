// src/features/reporting/annual-invoice-xlsx.ts
import "server-only";

import * as XLSX from "xlsx";

import type { AnnualInvoiceReport } from "@/application/invoices/annual-invoice-report";

type CellScalar = string | number | boolean | null;

const AMOUNT_NUMBER_FORMAT = "#,##0.00";

/**
 * Serialize annual invoice report to Excel with three sheets:
 * 1. Invoices issued in the year
 * 2. Payments collected in the year
 * 3. Total collected summary
 */
export function serializeAnnualInvoiceXlsx(report: AnnualInvoiceReport): Buffer {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    buildInvoicesSheet(report),
    "Invoices",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildPaymentsSheet(report),
    "Payments",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildTotalsSheet(report),
    "TotalCollected",
  );

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
}

function buildInvoicesSheet(report: AnnualInvoiceReport): XLSX.WorkSheet {
  const headers = [
    "invoice_date",
    "reference",
    "client_name",
    "amount",
    "currency",
  ] as const;

  const rows: CellScalar[][] = report.invoices.map((invoice) => [
    invoice.invoiceDate.toISOString().slice(0, 10),
    invoice.reference ?? "",
    invoice.clientName,
    parseAmount(invoice.amount),
    invoice.currency,
  ]);

  return finalizeSheet(headers, rows, {
    columnWidths: [14, 20, 30, 14, 10],
    amountColumns: [3],
  });
}

function buildPaymentsSheet(report: AnnualInvoiceReport): XLSX.WorkSheet {
  const headers = [
    "payment_date",
    "invoice_reference",
    "client_name",
    "amount",
    "currency",
    "notes",
  ] as const;

  const rows: CellScalar[][] = report.payments.map((payment) => [
    payment.paymentDate.toISOString().slice(0, 10),
    payment.invoiceReference ?? "",
    payment.clientName,
    parseAmount(payment.amount),
    payment.currency,
    payment.notes ?? "",
  ]);

  return finalizeSheet(headers, rows, {
    columnWidths: [14, 20, 30, 14, 10, 30],
    amountColumns: [3],
  });
}

function buildTotalsSheet(report: AnnualInvoiceReport): XLSX.WorkSheet {
  const headers = ["currency", "total_collected"] as const;

  const rows: CellScalar[][] = report.totalCollectedByCurrency.map((total) => [
    total.currency,
    parseAmount(total.amount),
  ]);

  return finalizeSheet(headers, rows, {
    columnWidths: [10, 16],
    amountColumns: [1],
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
