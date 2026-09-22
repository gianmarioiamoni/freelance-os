// src/application/invoices/list-invoices-for-contract.ts
import { parseInvoiceTrackingFilter } from "@/application/invoices/invoice-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotFoundError } from "@/domain/contract-errors";
import type {
  InvoiceRecord,
  InvoiceTrackingFilter,
} from "@/domain/persistence-types";
import type { ContractRepository, InvoiceRepository } from "@/domain/repositories";

export async function listInvoicesForContract(
  context: WorkspaceContext,
  contractId: string,
  contracts: ContractRepository,
  invoices: InvoiceRepository,
  tracking?: InvoiceTrackingFilter | string,
): Promise<InvoiceRecord[]> {
  const contract = await contracts.getContract(context.workspaceId, contractId);

  if (!contract) {
    throw new ContractNotFoundError();
  }

  return invoices.listInvoicesForContract(
    context.workspaceId,
    contractId,
    parseInvoiceTrackingFilter(tracking),
  );
}