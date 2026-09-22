// src/application/invoices/list-invoices-for-contract.ts
import { parseInvoiceTrackingFilter } from "@/application/invoices/invoice-input";
import {
  toInvoiceDerivedView,
  type InvoiceDerivedView,
} from "@/application/invoices/invoice-derived-view";
import { sumPaidAmount } from "@/application/payments/paid-amount";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotFoundError } from "@/domain/contract-errors";
import type { InvoiceTrackingFilter } from "@/domain/persistence-types";
import type {
  ContractRepository,
  InvoiceRepository,
  PaymentRepository,
} from "@/domain/repositories";

export async function listInvoicesForContract(
  context: WorkspaceContext,
  contractId: string,
  contracts: ContractRepository,
  invoices: InvoiceRepository,
  payments: PaymentRepository,
  tracking?: InvoiceTrackingFilter | string,
  now?: Date,
): Promise<InvoiceDerivedView[]> {
  const contract = await contracts.getContract(context.workspaceId, contractId);

  if (!contract) {
    throw new ContractNotFoundError();
  }

  const rows = await invoices.listInvoicesForContract(
    context.workspaceId,
    contractId,
    parseInvoiceTrackingFilter(tracking),
  );

  return Promise.all(
    rows.map(async (invoice) => {
      const paymentRows = await payments.listPaymentsForInvoice(
        context.workspaceId,
        invoice.id,
      );

      return toInvoiceDerivedView(
        invoice,
        context,
        now,
        sumPaidAmount(paymentRows.map((payment) => payment.amount)),
      );
    }),
  );
}
