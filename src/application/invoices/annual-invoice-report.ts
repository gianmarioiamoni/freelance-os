// src/application/invoices/annual-invoice-report.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { CurrencyAmount } from "@/application/invoices/workspace-invoice-service";
import type {
  InvoiceRepository,
  InvoiceWorkspaceListRecord,
  PaymentRepository,
} from "@/domain/repositories";
import type { PaymentRecord } from "@/domain/persistence-types";

/**
 * Annual invoice detail for export.
 * Includes all ACTIVE invoices with invoiceDate in the selected year.
 */
export type AnnualInvoiceDetail = {
  invoiceId: string;
  invoiceDate: Date;
  reference: string | null;
  clientName: string;
  amount: string;
  currency: string;
};

/**
 * Annual payment detail for export.
 * Includes all payments with paymentDate in the selected year,
 * regardless of the invoice date.
 */
export type AnnualPaymentDetail = {
  paymentId: string;
  paymentDate: Date;
  invoiceId: string;
  invoiceReference: string | null;
  clientName: string;
  amount: string;
  currency: string;
  notes: string | null;
};

/**
 * Annual invoice and payment report for a calendar year.
 * 
 * - Invoices: filtered by invoiceDate in year (ACTIVE only)
 * - Payments: filtered by paymentDate in year (includes payments for invoices from other years)
 * - Total collected: sum of payment amounts by currency
 */
export type AnnualInvoiceReport = {
  year: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
  invoices: AnnualInvoiceDetail[];
  payments: AnnualPaymentDetail[];
  totalCollectedByCurrency: CurrencyAmount[];
};

export class AnnualInvoiceReportService {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentRepository,
  ) {}

  /**
   * Generate annual invoice and payment report for a calendar year.
   * 
   * - year: 4-digit calendar year (e.g., 2026)
   * - Returns invoices emitted in the year (by invoiceDate)
   * - Returns payments collected in the year (by paymentDate)
   * - Total collected is sum of payment amounts, grouped by currency
   */
  async getAnnualInvoiceReport(
    context: WorkspaceContext,
    year: number,
  ): Promise<AnnualInvoiceReport> {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new AnnualReportError(`Invalid year: ${year}`);
    }

    const period = {
      startDate: new Date(Date.UTC(year, 0, 1)),
      endDate: new Date(Date.UTC(year, 11, 31)),
    };

    const [invoiceRows, paymentRows] = await Promise.all([
      this.getInvoicesForYear(context.workspaceId, period),
      this.getPaymentsForYear(context.workspaceId, period),
    ]);

    const invoices = invoiceRows.map((row) => ({
      invoiceId: row.id,
      invoiceDate: row.invoiceDate,
      reference: row.reference,
      clientName: row.clientName,
      amount: row.amount,
      currency: row.currency,
    }));

    const invoiceMap = new Map(
      invoiceRows.map((row) => [row.id, { reference: row.reference, clientName: row.clientName }]),
    );

    const payments = paymentRows.map((row) => {
      const invoice = invoiceMap.get(row.invoiceId);
      return {
        paymentId: row.id,
        paymentDate: row.paymentDate,
        invoiceId: row.invoiceId,
        invoiceReference: invoice?.reference ?? null,
        clientName: invoice?.clientName ?? "Unknown",
        amount: row.amount,
        currency: row.currency,
        notes: row.notes,
      };
    });

    const totalCollectedByCurrency = this.computeTotalCollected(paymentRows);

    return {
      year,
      period,
      invoices,
      payments,
      totalCollectedByCurrency,
    };
  }

  private async getInvoicesForYear(
    workspaceId: string,
    period: { startDate: Date; endDate: Date },
  ): Promise<InvoiceWorkspaceListRecord[]> {
    return this.invoices.listInvoicesForWorkspace(workspaceId, {
      tracking: "ACTIVE",
      period,
    });
  }

  private async getPaymentsForYear(
    workspaceId: string,
    period: { startDate: Date; endDate: Date },
  ): Promise<PaymentRecord[]> {
    // Get all ACTIVE invoices in workspace (we need invoice metadata)
    const allInvoices = await this.invoices.listInvoicesForWorkspace(workspaceId, {
      tracking: "ACTIVE",
    });

    if (allInvoices.length === 0) {
      return [];
    }

    const allPayments = await this.payments.listPaymentsForInvoices(
      workspaceId,
      allInvoices.map((inv) => inv.id),
    );

    // Filter payments by paymentDate in year
    return allPayments.filter(
      (payment) =>
        payment.paymentDate >= period.startDate && payment.paymentDate <= period.endDate,
    );
  }

  private computeTotalCollected(payments: PaymentRecord[]): CurrencyAmount[] {
    const totals = new Map<string, bigint>();

    for (const payment of payments) {
      const current = totals.get(payment.currency) ?? BigInt(0);
      totals.set(payment.currency, current + this.toScaledBigInt(payment.amount));
    }

    return Array.from(totals.entries())
      .map(([currency, scaled]) => ({
        currency,
        amount: this.fromScaledBigInt(scaled),
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }

  private toScaledBigInt(amount: string): bigint {
    const [whole = "0", fraction = ""] = amount.trim().split(".");
    const paddedFraction = fraction.padEnd(4, "0").slice(0, 4);
    return BigInt(`${whole}${paddedFraction}`);
  }

  private fromScaledBigInt(scaled: bigint): string {
    if (scaled === BigInt(0)) {
      return "0";
    }

    const str = scaled.toString().padStart(5, "0");
    const whole = str.slice(0, -4) || "0";
    const fraction = str.slice(-4);

    return `${whole}.${fraction}`;
  }
}

export class AnnualReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnnualReportError";
  }
}
