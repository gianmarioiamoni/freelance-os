// src/features/payments/invoice-payment-access.ts
import { listPaymentsForInvoice } from "@/application/payments/list-payments-for-invoice";
import { getPayment } from "@/application/payments/get-payment";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { PaymentRecord } from "@/domain/persistence-types";
import type {
  ContractRepository,
  InvoiceRepository,
  PaymentRepository,
} from "@/domain/repositories";
import { getInvoiceOnContract } from "@/features/invoices/contract-invoice-access";

export async function listPaymentsOnInvoice(
  context: WorkspaceContext,
  contractId: string,
  invoiceId: string,
  contracts: ContractRepository,
  invoices: InvoiceRepository,
  payments: PaymentRepository,
): Promise<PaymentRecord[]> {
  const invoice = await getInvoiceOnContract(
    context,
    contractId,
    invoiceId,
    contracts,
    invoices,
    payments,
  );

  return listPaymentsForInvoice(context, invoice.id, invoices, payments);
}

export async function getPaymentOnInvoice(
  context: WorkspaceContext,
  contractId: string,
  invoiceId: string,
  paymentId: string,
  contracts: ContractRepository,
  invoices: InvoiceRepository,
  payments: PaymentRepository,
): Promise<PaymentRecord> {
  const invoice = await getInvoiceOnContract(
    context,
    contractId,
    invoiceId,
    contracts,
    invoices,
    payments,
  );

  return getPayment(context, invoice.id, paymentId, invoices, payments);
}
