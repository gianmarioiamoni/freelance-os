// src/features/invoices/contract-invoice-access.ts
import { getContract } from "@/application/contracts/get-contract";
import { getInvoice } from "@/application/invoices/get-invoice";
import type { InvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import { listInvoicesForContract } from "@/application/invoices/list-invoices-for-contract";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import type { InvoiceTrackingFilter } from "@/domain/persistence-types";
import type { ContractRepository, InvoiceRepository } from "@/domain/repositories";

export async function listInvoicesOnContract(
  context: WorkspaceContext,
  contractId: string,
  contracts: ContractRepository,
  invoices: InvoiceRepository,
  tracking?: InvoiceTrackingFilter,
  now?: Date,
): Promise<InvoiceDerivedView[]> {
  return listInvoicesForContract(
    context,
    contractId,
    contracts,
    invoices,
    tracking,
    now,
  );
}

export async function getInvoiceOnContract(
  context: WorkspaceContext,
  contractId: string,
  invoiceId: string,
  contracts: ContractRepository,
  invoices: InvoiceRepository,
  now?: Date,
): Promise<InvoiceDerivedView> {
  await getContract(context, contractId, contracts);
  const invoice = await getInvoice(context, invoiceId, invoices, now);

  if (invoice.contractId !== contractId) {
    throw new InvoiceNotFoundError();
  }

  return invoice;
}
