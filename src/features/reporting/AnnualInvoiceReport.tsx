// src/features/reporting/AnnualInvoiceReport.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DownloadIcon } from "lucide-react";
import { useState, useEffect, type JSX } from "react";

type CurrencyAmount = {
  currency: string;
  amount: string;
};

type AnnualInvoiceDetail = {
  invoiceId: string;
  invoiceDate: string;
  reference: string | null;
  clientName: string;
  amount: string;
  currency: string;
};

type AnnualPaymentDetail = {
  paymentId: string;
  paymentDate: string;
  invoiceId: string;
  invoiceReference: string | null;
  clientName: string;
  amount: string;
  currency: string;
  notes: string | null;
};

type AnnualInvoiceReport = {
  year: number;
  period: {
    startDate: string;
    endDate: string;
  };
  invoices: AnnualInvoiceDetail[];
  payments: AnnualPaymentDetail[];
  totalCollectedByCurrency: CurrencyAmount[];
};

type AnnualInvoiceReportProps = {
  initialYear: number;
};

export function AnnualInvoiceReport({
  initialYear,
}: AnnualInvoiceReportProps): JSX.Element {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [report, setReport] = useState<AnnualInvoiceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    loadReport(selectedYear);
  }, [selectedYear]);

  async function loadReport(year: number): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/reports/annual-invoices?year=${year}`);
      if (!response.ok) {
        throw new Error("Failed to load report");
      }
      const data = (await response.json()) as AnnualInvoiceReport;
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload(format: "csv" | "xlsx"): void {
    const url = `/reports/export/annual-invoices?year=${selectedYear}&format=${format}`;
    window.open(url, "_blank");
  }

  return (
    <section
      aria-labelledby="annual-invoices-heading"
      className="grid gap-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="annual-invoices-heading"
            className="text-base font-semibold"
          >
            Annual Invoices & Payments
          </h2>
          <p className="text-sm text-muted-foreground">
            Invoices issued and payments collected in the selected year
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={String(selectedYear)}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("csv")}
            disabled={loading || !report}
          >
            <DownloadIcon className="h-4 w-4 mr-1" />
            CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("xlsx")}
            disabled={loading || !report}
          >
            <DownloadIcon className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {loading && (
        <Card className="p-8 text-center text-muted-foreground">
          Loading report for {selectedYear}...
        </Card>
      )}

      {error && (
        <Card className="p-8 text-center">
          <p className="text-destructive font-medium">Error</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadReport(selectedYear)}
            className="mt-4"
          >
            Retry
          </Button>
        </Card>
      )}

      {!loading && !error && report && (
        <>
          {/* Total Collected Summary */}
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">
              Total Collected in {selectedYear}
            </h3>
            {report.totalCollectedByCurrency.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payments collected
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {report.totalCollectedByCurrency.map((total) => (
                  <div
                    key={total.currency}
                    className="flex items-baseline justify-between rounded-md border p-3"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {total.currency}
                    </span>
                    <span className="text-lg font-semibold">
                      {formatAmount(total.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Invoices Issued */}
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">
              Invoices Issued ({report.invoices.length})
            </h3>
            {report.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoices issued in {selectedYear}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Reference</th>
                      <th className="pb-2 font-medium">Client</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium">Currency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.invoices.map((invoice) => (
                      <tr key={invoice.invoiceId}>
                        <td className="py-2">
                          {formatDate(invoice.invoiceDate)}
                        </td>
                        <td className="py-2">
                          {invoice.reference || "—"}
                        </td>
                        <td className="py-2">{invoice.clientName}</td>
                        <td className="py-2 text-right font-mono">
                          {formatAmount(invoice.amount)}
                        </td>
                        <td className="py-2">{invoice.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Payments Collected */}
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">
              Payments Collected ({report.payments.length})
            </h3>
            {report.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payments collected in {selectedYear}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Invoice Ref</th>
                      <th className="pb-2 font-medium">Client</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium">Currency</th>
                      <th className="pb-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.payments.map((payment) => (
                      <tr key={payment.paymentId}>
                        <td className="py-2">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="py-2">
                          {payment.invoiceReference || "—"}
                        </td>
                        <td className="py-2">{payment.clientName}</td>
                        <td className="py-2 text-right font-mono">
                          {formatAmount(payment.amount)}
                        </td>
                        <td className="py-2">{payment.currency}</td>
                        <td className="py-2 text-muted-foreground">
                          {payment.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </section>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
