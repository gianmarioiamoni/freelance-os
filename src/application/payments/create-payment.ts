// src/application/payments/create-payment.ts
import {
  parsePaymentCreateInput,
  type PaymentCreateInput,
} from "@/application/payments/payment-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { isActiveInvoice } from "@/domain/invoice";
import {
  InvoiceNotEditableError,
  InvoiceNotFoundError,
} from "@/domain/invoice-errors";
import { InvalidPaymentInputError } from "@/domain/payment-errors";
import {
  ConstraintViolationError,
  ForeignKeyViolationError,
} from "@/domain/persistence-errors";
import type { PaymentRecord } from "@/domain/persistence-types";
import type { RunInTransaction } from "@/domain/repositories";

export async function createPayment(
  context: WorkspaceContext,
  input: PaymentCreateInput,
  runInTransaction: RunInTransaction,
): Promise<PaymentRecord> {
  const validated = parsePaymentCreateInput(input);

  return runInTransaction(async (repositories) => {
    const invoice = await repositories.invoices.lockInvoice(
      context.workspaceId,
      validated.invoiceId,
    );

    if (!invoice) {
      throw new InvoiceNotFoundError();
    }

    if (!isActiveInvoice(invoice.voidedAt)) {
      throw new InvoiceNotEditableError();
    }

    if (validated.currency !== undefined && validated.currency !== invoice.currency) {
      throw new InvalidPaymentInputError("currency");
    }

    try {
      return await repositories.payments.createPayment(context.workspaceId, {
        invoiceId: invoice.id,
        paymentDate: validated.paymentDate,
        amount: validated.amount,
        currency: invoice.currency,
        notes: validated.notes,
      });
    } catch (error) {
      if (error instanceof ForeignKeyViolationError) {
        throw new InvoiceNotFoundError();
      }

      if (error instanceof ConstraintViolationError) {
        throw new InvalidPaymentInputError("amount");
      }

      throw error;
    }
  });
}
