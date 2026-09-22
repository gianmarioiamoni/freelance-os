// src/application/payments/update-payment.ts
import {
  parsePaymentUpdateInput,
  type PaymentUpdateInput,
} from "@/application/payments/payment-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { isActiveInvoice } from "@/domain/invoice";
import {
  InvoiceNotEditableError,
  InvoiceNotFoundError,
} from "@/domain/invoice-errors";
import {
  InvalidPaymentInputError,
  PaymentNotFoundError,
} from "@/domain/payment-errors";
import {
  ConstraintViolationError,
  RecordNotFoundError,
} from "@/domain/persistence-errors";
import type { PaymentRecord } from "@/domain/persistence-types";
import type { RunInTransaction } from "@/domain/repositories";

export async function updatePayment(
  context: WorkspaceContext,
  invoiceId: string,
  paymentId: string,
  input: PaymentUpdateInput & Record<string, unknown>,
  runInTransaction: RunInTransaction,
): Promise<PaymentRecord> {
  const validated = parsePaymentUpdateInput(input);

  return runInTransaction(async (repositories) => {
    const invoice = await repositories.invoices.lockInvoice(
      context.workspaceId,
      invoiceId,
    );

    if (!invoice) {
      throw new InvoiceNotFoundError();
    }

    if (!isActiveInvoice(invoice.voidedAt)) {
      throw new InvoiceNotEditableError();
    }

    const existing = await repositories.payments.getPayment(
      context.workspaceId,
      paymentId,
    );

    if (!existing || existing.invoiceId !== invoice.id) {
      throw new PaymentNotFoundError();
    }

    try {
      return await repositories.payments.updatePayment(
        context.workspaceId,
        paymentId,
        validated,
      );
    } catch (error) {
      if (error instanceof RecordNotFoundError) {
        throw new PaymentNotFoundError();
      }

      if (error instanceof ConstraintViolationError) {
        throw new InvalidPaymentInputError("amount");
      }

      throw error;
    }
  });
}
