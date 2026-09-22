// src/features/invoices/load-invoices.ts
import type { InvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import { ContractNotFoundError } from "@/domain/contract-errors";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import { getInvoiceOnContract, listInvoicesOnContract } from "@/features/invoices/contract-invoice-access";
import { readInvoiceTrackingParam } from "@/features/invoices/invoice-display";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { notFound } from "next/navigation";

export async function loadContractInvoices(
  contractId: string,
  tracking?: string,
): Promise<InvoiceDerivedView[]> {
  const context = await getCurrentWorkspaceContext();
  const repositories = createRepositories();

  try {
    return await listInvoicesOnContract(
      context,
      contractId,
      repositories.contracts,
      repositories.invoices,
      readInvoiceTrackingParam(tracking),
    );
  } catch (error) {
    if (error instanceof ContractNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export async function loadContractInvoice(
  contractId: string,
  invoiceId: string,
): Promise<InvoiceDerivedView> {
  const context = await getCurrentWorkspaceContext();
  const repositories = createRepositories();

  try {
    return await getInvoiceOnContract(
      context,
      contractId,
      invoiceId,
      repositories.contracts,
      repositories.invoices,
    );
  } catch (error) {
    if (error instanceof ContractNotFoundError || error instanceof InvoiceNotFoundError) {
      notFound();
    }

    throw error;
  }
}
