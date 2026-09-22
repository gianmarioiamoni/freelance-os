// src/application/invoices/update-invoice.ts
import {
  parseInvoiceUpdateInput,
  type InvoiceUpdateInput,
} from "@/application/invoices/invoice-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import {
  assertDueDateTermsConsistency,
  computeDueDate,
  isActiveInvoice,
} from "@/domain/invoice";
import {
  InvoiceNotEditableError,
  InvoiceNotFoundError,
  InvalidInvoiceInputError,
} from "@/domain/invoice-errors";
import {
  ConstraintViolationError,
  RecordNotFoundError,
} from "@/domain/persistence-errors";
import type { InvoiceRecord } from "@/domain/persistence-types";
import type { InvoiceRepository } from "@/domain/repositories";

export async function updateInvoice(
  context: WorkspaceContext,
  invoiceId: string,
  input: InvoiceUpdateInput & Record<string, unknown>,
  invoices: InvoiceRepository,
): Promise<InvoiceRecord> {
  const validated = parseInvoiceUpdateInput(input);
  const existing = await invoices.getInvoice(context.workspaceId, invoiceId);

  if (!existing) {
    throw new InvoiceNotFoundError();
  }

  if (!isActiveInvoice(existing.voidedAt)) {
    throw new InvoiceNotEditableError();
  }

  const dueDate =
    validated.invoiceDate !== undefined
      ? computeDueDate(validated.invoiceDate, existing.paymentTermsDays)
      : existing.dueDate;

  assertDueDateTermsConsistency(existing.paymentTermsDays, dueDate);

  try {
    return await invoices.updateInvoice(context.workspaceId, invoiceId, {
      ...(validated.invoiceDate !== undefined && {
        invoiceDate: validated.invoiceDate,
        dueDate,
      }),
      ...(validated.amount !== undefined && { amount: validated.amount }),
      ...(validated.reference !== undefined && { reference: validated.reference }),
    });
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      throw new InvoiceNotFoundError();
    }

    if (error instanceof ConstraintViolationError) {
      throw new InvalidInvoiceInputError("amount");
    }

    throw error;
  }
}