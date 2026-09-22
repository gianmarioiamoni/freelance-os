// src/application/invoices/create-invoice.ts
import {
  parseInvoiceCreateInput,
  type InvoiceCreateInput,
} from "@/application/invoices/invoice-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotFoundError } from "@/domain/contract-errors";
import {
  assertDueDateTermsConsistency,
  computeDueDate,
} from "@/domain/invoice";
import { InvalidInvoiceInputError } from "@/domain/invoice-errors";
import {
  ConstraintViolationError,
  ForeignKeyViolationError,
} from "@/domain/persistence-errors";
import type { InvoiceRecord } from "@/domain/persistence-types";
import type { RunInTransaction } from "@/domain/repositories";

export async function createInvoice(
  context: WorkspaceContext,
  input: InvoiceCreateInput,
  runInTransaction: RunInTransaction,
): Promise<InvoiceRecord> {
  const validated = parseInvoiceCreateInput(input);

  return runInTransaction(async (repositories) => {
    const contract = await repositories.contracts.lockContract(
      context.workspaceId,
      validated.contractId,
    );

    if (!contract) {
      throw new ContractNotFoundError();
    }

    if (
      validated.currency !== undefined &&
      validated.currency !== contract.currency
    ) {
      throw new InvalidInvoiceInputError("currency");
    }

    const paymentTermsDays = contract.paymentTermsDays;
    const dueDate = computeDueDate(validated.invoiceDate, paymentTermsDays);
    assertDueDateTermsConsistency(paymentTermsDays, dueDate);

    try {
      return await repositories.invoices.createInvoice(context.workspaceId, {
        contractId: contract.id,
        invoiceDate: validated.invoiceDate,
        amount: validated.amount,
        currency: contract.currency,
        reference: validated.reference,
        paymentTermsDays,
        dueDate,
      });
    } catch (error) {
      if (error instanceof ForeignKeyViolationError) {
        throw new ContractNotFoundError();
      }

      if (error instanceof ConstraintViolationError) {
        throw new InvalidInvoiceInputError("amount");
      }

      throw error;
    }
  });
}
