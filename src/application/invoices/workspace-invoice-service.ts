// src/application/invoices/workspace-invoice-service.ts
import {
  toInvoiceDerivedView,
  type InvoiceDerivedView,
} from "@/application/invoices/invoice-derived-view";
import { parseInvoiceTrackingFilter } from "@/application/invoices/invoice-input";
import { sumPaidAmount } from "@/application/payments/paid-amount";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import { ContractNotFoundError } from "@/domain/contract-errors";
import type { InvoiceAmountStatus } from "@/domain/invoice-derived";
import { isOverdue } from "@/domain/invoice-derived";
import type { InvoiceTrackingFilter } from "@/domain/persistence-types";
import type {
  ClientRepository,
  ContractRepository,
  InvoiceRepository,
  PaymentRepository,
  WorkspaceInvoiceFilter,
} from "@/domain/repositories";
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

/** Period-only filter for summary aggregates (E01). */
export type WorkspaceInvoiceSummaryFilter = {
  period?: {
    startDate: Date;
    endDate: Date;
  };
};

/**
 * List filter for workspace invoice listing (E02).
 * tracking/period/clientId/contractId apply in persistence.
 * amountStatus/overdue apply in application after authoritative paid derivation.
 */
export type WorkspaceInvoiceListFilter = {
  tracking?: InvoiceTrackingFilter | string;
  period?: {
    startDate: Date;
    endDate: Date;
  };
  clientId?: string;
  contractId?: string;
  amountStatus?: InvoiceAmountStatus;
  overdue?: boolean;
};

export type WorkspaceInvoiceListItem = InvoiceDerivedView & {
  clientId: string;
  clientName: string;
};

export class WorkspaceInvoiceService {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentRepository,
    private readonly clients: ClientRepository,
    private readonly contracts: ContractRepository,
  ) {}

  async getWorkspaceInvoiceSummary(
    context: WorkspaceContext,
    filter?: WorkspaceInvoiceSummaryFilter,
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

    const overdueCount = await this.getOverdueCount(context, filter?.period);

    return {
      invoicedByCurrency,
      paidByCurrency,
      outstandingByCurrency,
      overdueCount,
    };
  }

  /**
   * Workspace-scoped invoice list with client/contract identity and derived payment fields.
   * Default tracking: ACTIVE. Ordering: newest invoiceDate/createdAt first.
   */
  async listInvoicesForWorkspace(
    context: WorkspaceContext,
    filter?: WorkspaceInvoiceListFilter,
    now?: Date,
  ): Promise<WorkspaceInvoiceListItem[]> {
    const repoFilter = await this.toRepositoryFilter(context, filter);

    const rows = await this.invoices.listInvoicesForWorkspace(
      context.workspaceId,
      repoFilter,
    );

    if (rows.length === 0) {
      return [];
    }

    const payments = await this.payments.listPaymentsForInvoices(
      context.workspaceId,
      rows.map((row) => row.id),
    );

    const paidByInvoice = new Map<string, string[]>();
    for (const payment of payments) {
      const amounts = paidByInvoice.get(payment.invoiceId) ?? [];
      amounts.push(payment.amount);
      paidByInvoice.set(payment.invoiceId, amounts);
    }

    const items = rows.map((row) => {
      const paidAmount = sumPaidAmount(paidByInvoice.get(row.id) ?? []);
      const derived = toInvoiceDerivedView(row, context, now, paidAmount);

      return {
        ...derived,
        clientId: row.clientId,
        clientName: row.clientName,
      };
    });

    return items.filter((item) => matchesDerivedFilters(item, filter));
  }

  private async toRepositoryFilter(
    context: WorkspaceContext,
    filter?: WorkspaceInvoiceListFilter,
  ): Promise<WorkspaceInvoiceFilter> {
    const tracking = parseInvoiceTrackingFilter(filter?.tracking);
    const clientId = filter?.clientId?.trim() || undefined;
    const contractId = filter?.contractId?.trim() || undefined;

    if (clientId) {
      const client = await this.clients.getClient(context.workspaceId, clientId);
      if (!client) {
        throw new ClientNotFoundError();
      }
    }

    if (contractId) {
      const contract = await this.contracts.getContract(
        context.workspaceId,
        contractId,
      );
      if (!contract) {
        throw new ContractNotFoundError();
      }
    }

    return {
      tracking,
      period: filter?.period,
      clientId,
      contractId,
    };
  }

  private async getInvoicedAmountsByPeriod(
    workspaceId: string,
    period?: { startDate: Date; endDate: Date },
  ): Promise<CurrencyAmount[]> {
    const invoices = await this.invoices.listInvoicesForWorkspace(workspaceId, {
      tracking: "ACTIVE",
      period,
    });

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
    const invoices = await this.invoices.listInvoicesForWorkspace(workspaceId, {
      tracking: "ACTIVE",
      period,
    });

    const invoiceIds = invoices.map((inv) => inv.id);
    if (invoiceIds.length === 0) {
      return [];
    }

    const paymentRows = await this.payments.listPaymentsForInvoices(
      workspaceId,
      invoiceIds,
    );

    const totals = new Map<string, bigint>();

    for (const payment of paymentRows) {
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
      const invoicedAmount =
        invoiced.find((i) => i.currency === currency)?.amount ?? "0";
      const paidAmount = paidMap.get(currency) ?? "0";
      const outstanding = this.subtractAmounts(invoicedAmount, paidAmount);

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

    if (invoices.length === 0) {
      return 0;
    }

    const payments = await this.payments.listPaymentsForInvoices(
      context.workspaceId,
      invoices.map((invoice) => invoice.id),
    );

    const paidByInvoice = new Map<string, string[]>();
    for (const payment of payments) {
      const amounts = paidByInvoice.get(payment.invoiceId) ?? [];
      amounts.push(payment.amount);
      paidByInvoice.set(payment.invoiceId, amounts);
    }

    const today = getTodayInTimezone(context.timezone);
    let count = 0;

    for (const invoice of invoices) {
      const paidAmount = sumPaidAmount(paidByInvoice.get(invoice.id) ?? []);
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

function matchesDerivedFilters(
  item: WorkspaceInvoiceListItem,
  filter?: WorkspaceInvoiceListFilter,
): boolean {
  if (filter?.amountStatus && item.amountStatus !== filter.amountStatus) {
    return false;
  }

  if (filter?.overdue !== undefined && item.overdue !== filter.overdue) {
    return false;
  }

  return true;
}
