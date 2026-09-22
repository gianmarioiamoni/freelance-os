// src/features/payments/payment-display.ts
import { invoiceDetailPath } from "@/features/invoices/invoice-display";

export function paymentCreatePath(contractId: string, invoiceId: string): string {
  return `${invoiceDetailPath(contractId, invoiceId)}/payments/new`;
}

export function paymentEditPath(
  contractId: string,
  invoiceId: string,
  paymentId: string,
): string {
  return `${invoiceDetailPath(contractId, invoiceId)}/payments/${paymentId}/edit`;
}

export function paymentDeleteConfirmHref(
  contractId: string,
  invoiceId: string,
  paymentId: string,
): string {
  return `${invoiceDetailPath(contractId, invoiceId)}?confirm=delete-payment&paymentId=${paymentId}`;
}

export function paymentNotesText(notes: string | null): string | null {
  if (notes == null || notes.length === 0) {
    return null;
  }

  return notes;
}
