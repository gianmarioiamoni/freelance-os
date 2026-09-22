// src/application/contracts/assert-contract-currency-mutable.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractCurrencyImmutableError } from "@/domain/contract-errors";
import type { InvoiceRepository } from "@/domain/repositories";

export async function assertContractCurrencyMutable(
  context: WorkspaceContext,
  contractId: string,
  invoices: InvoiceRepository,
): Promise<void> {
  const exists = await invoices.existsForContract(context.workspaceId, contractId);

  if (exists) {
    throw new ContractCurrencyImmutableError();
  }
}