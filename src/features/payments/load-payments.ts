// src/features/payments/load-payments.ts
import { listPaymentsForInvoice } from "@/application/payments/list-payments-for-invoice";
import type { InvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import type { PaymentRecord } from "@/domain/persistence-types";
import { ContractNotFoundError } from "@/domain/contract-errors";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import { PaymentNotFoundError } from "@/domain/payment-errors";
import { getInvoiceOnContract } from "@/features/invoices/contract-invoice-access";
import { getPaymentOnInvoice } from "@/features/payments/invoice-payment-access";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { notFound } from "next/navigation";

export async function loadContractInvoicePayments(
  contractId: string,
  invoiceId: string,
): Promise<{
  invoice: InvoiceDerivedView;
  payments: PaymentRecord[];
}> {
  const context = await getCurrentWorkspaceContext();
  const repositories = createRepositories();

  try {
    const invoice = await getInvoiceOnContract(
      context,
      contractId,
      invoiceId,
      repositories.contracts,
      repositories.invoices,
      repositories.payments,
    );
    const payments = await listPaymentsForInvoice(
      context,
      invoice.id,
      repositories.invoices,
      repositories.payments,
    );

    return { invoice, payments };
  } catch (error) {
    if (error instanceof ContractNotFoundError || error instanceof InvoiceNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export async function loadContractInvoicePayment(
  contractId: string,
  invoiceId: string,
  paymentId: string,
): Promise<PaymentRecord> {
  const context = await getCurrentWorkspaceContext();
  const repositories = createRepositories();

  try {
    return await getPaymentOnInvoice(
      context,
      contractId,
      invoiceId,
      paymentId,
      repositories.contracts,
      repositories.invoices,
      repositories.payments,
    );
  } catch (error) {
    if (
      error instanceof ContractNotFoundError ||
      error instanceof InvoiceNotFoundError ||
      error instanceof PaymentNotFoundError
    ) {
      notFound();
    }

    throw error;
  }
}
