// src/application/invoices/workspace-invoice-service.ts
import { sumPaidAmount } from "@/application/payments/paid-amount";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { isOverdue } from "@/domain/invoice-derived";
import type { InvoiceRepository, PaymentRepository } from "@/domain/repositories";
import { getTodayInTimezone } from "@/lib/analytics-periods";

export type CurrencyAmount = {
  currency: string;
  amount: string;
};

export type WorkspaceInvoiceSummary = {
  invoicedByCurrency: CurrencyAmount[];
  paidByCurrency: CurrencyAmount[];
  outstandingByCurrency: CurrencyAmount[];
  overdueCount: number;
};

export type WorkspaceInvoiceFilter = {
  period?: {
    startDate: Date;
    endDate: Date;
  };
};

export class WorkspaceInvoiceService {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentRepository,
  ) {}

  async getWorkspaceInvoiceSummary(
    context: WorkspaceContext,
    filter?: WorkspaceInvoiceFilter,
  ): Promise<WorkspaceInvoiceSummary> {
    const invoicedByCurrency = await this.getInvoicedAmountsByPeriod(
      context.workspaceId,
      filter?.period,
    );

    const paidByCurrency = await this.getPaidAmountsByPeriod(
      context.workspaceId,
      filter?.period,
    );

    const outstandingByCurrency = this.computeOutstandingByCurrency(
      invoicedByCurrency,
      paidByCurrency,
    );

    const overdueCount = await this.getOverdueCount(
      context,
      filter?.period,
    );

    return {
      invoicedByCurrency,
      paidByCurrency,
      outstandingByCurrency,
      overdueCount,
    };
  }

  private async getInvoicedAmountsByPeriod(
    workspaceId: string,
    period?: { startDate: Date; endDate: Date },
  ): Promise<CurrencyAmount[]> {
    const invoices = await this.invoices.listInvoicesForWorkspace(
      workspaceId,
      { tracking: "ACTIVE", period },
    );

    const totals = new Map<string, bigint>();

    for (const invoice of invoices) {
      const current = totals.get(invoice.currency) ?? BigInt(0);
      totals.set(invoice.currency, current + this.toScaledBigInt(invoice.amount));
    }

    return Array.from(totals.entries())
      .map(([currency, scaled]) => ({
        currency,
        amount: this.fromScaledBigInt(scaled),
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }

  private async getPaidAmountsByPeriod(
    workspaceId: string,
    period?: { startDate: Date; endDate: Date },
  ): Promise<CurrencyAmount[]> {
    const invoices = await this.invoices.listInvoicesForWorkspace(
      workspaceId,
      { tracking: "ACTIVE", period },
    );

    const invoiceIds = invoices.map((inv) => inv.id);
    if (invoiceIds.length === 0) {
      return [];
    }

    const totals = new Map<string, bigint>();

    for (const invoiceId of invoiceIds) {
      const paymentRows = await this.payments.listPaymentsForInvoice(
        workspaceId,
        invoiceId,
      );

      for (const payment of paymentRows) {
        const current = totals.get(payment.currency) ?? BigInt(0);
        totals.set(payment.currency, current + this.toScaledBigInt(payment.amount));
      }
    }

    return Array.from(totals.entries())
      .map(([currency, scaled]) => ({
        currency,
        amount: this.fromScaledBigInt(scaled),
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }

  private computeOutstandingByCurrency(
    invoiced: CurrencyAmount[],
    paid: CurrencyAmount[],
  ): CurrencyAmount[] {
    const paidMap = new Map(paid.map((p) => [p.currency, p.amount]));
    const allCurrencies = new Set([
      ...invoiced.map((i) => i.currency),
      ...paid.map((p) => p.currency),
    ]);

    const result: CurrencyAmount[] = [];

    for (const currency of allCurrencies) {
      const invoicedAmount = invoiced.find((i) => i.currency === currency)?.amount ?? "0";
      const paidAmount = paidMap.get(currency) ?? "0";

      const outstanding = this.subtractAmounts(invoicedAmount, paidAmount);

      // Only include if outstanding > 0
      if (this.compareAmounts(outstanding, "0") > 0) {
        result.push({ currency, amount: outstanding });
      }
    }

    return result.sort((a, b) => a.currency.localeCompare(b.currency));
  }

  private async getOverdueCount(
    context: WorkspaceContext,
    period?: { startDate: Date; endDate: Date },
  ): Promise<number> {
    const invoices = await this.invoices.listInvoicesForWorkspace(
      context.workspaceId,
      { tracking: "ACTIVE", period },
    );

    const today = getTodayInTimezone(context.timezone);
    let count = 0;

    for (const invoice of invoices) {
      const paymentRows = await this.payments.listPaymentsForInvoice(
        context.workspaceId,
        invoice.id,
      );

      const paidAmount = sumPaidAmount(paymentRows.map((p) => p.amount));

      if (isOverdue(invoice.dueDate, today, paidAmount, invoice.amount)) {
        count++;
      }
    }

    return count;
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

  private subtractAmounts(a: string, b: string): string {
    const scaledA = this.toScaledBigInt(a);
    const scaledB = this.toScaledBigInt(b);
    const result = scaledA - scaledB;

    if (result < BigInt(0)) {
      return "0";
    }

    return this.fromScaledBigInt(result);
  }

  private compareAmounts(a: string, b: string): number {
    const scaledA = this.toScaledBigInt(a);
    const scaledB = this.toScaledBigInt(b);

    if (scaledA < scaledB) return -1;
    if (scaledA > scaledB) return 1;
    return 0;
  }
}
