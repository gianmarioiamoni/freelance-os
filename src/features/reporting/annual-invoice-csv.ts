// src/features/reporting/annual-invoice-csv.ts
import type { AnnualInvoiceReport } from "@/application/invoices/annual-invoice-report";
import { serializeCsv } from "@/lib/csv";

/**
 * Serialize annual invoice report to CSV with three sections:
 * 1. Metadata (year, period)
 * 2. Invoices issued in the year
 * 3. Payments collected in the year
 * 4. Total collected by currency
 */
export function serializeAnnualInvoiceCsv(report: AnnualInvoiceReport): string {
  const rows: string[][] = [];

  // Section: Metadata
  rows.push(["section", "metadata"]);
  rows.push([
    "year",
    "period_start",
    "period_end",
  ]);
  rows.push([
    String(report.year),
    report.period.startDate.toISOString().slice(0, 10),
    report.period.endDate.toISOString().slice(0, 10),
  ]);
  rows.push([]);

  // Section: Invoices issued
  rows.push(["section", "invoices_issued"]);
  rows.push([
    "invoice_date",
    "invoice_reference",
    "client_name",
    "amount",
    "currency",
  ]);
  for (const invoice of report.invoices) {
    rows.push([
      invoice.invoiceDate.toISOString().slice(0, 10),
      invoice.reference ?? "",
      invoice.clientName,
      formatAmount(invoice.amount),
      invoice.currency,
    ]);
  }
  rows.push([]);

  // Section: Payments collected
  rows.push(["section", "payments_collected"]);
  rows.push([
    "payment_date",
    "invoice_reference",
    "client_name",
    "amount",
    "currency",
    "notes",
  ]);
  for (const payment of report.payments) {
    rows.push([
      payment.paymentDate.toISOString().slice(0, 10),
      payment.invoiceReference ?? "",
      payment.clientName,
      formatAmount(payment.amount),
      payment.currency,
      payment.notes ?? "",
    ]);
  }
  rows.push([]);

  // Section: Total collected
  rows.push(["section", "total_collected"]);
  rows.push(["currency", "total"]);
  for (const total of report.totalCollectedByCurrency) {
    rows.push([total.currency, formatAmount(total.amount)]);
  }

  return serializeCsv(rows);
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  return num.toFixed(2);
}

export function annualInvoiceFilename(year: number, format: "csv" | "xlsx"): string {
  return `annual-invoices-${year}.${format}`;
}
