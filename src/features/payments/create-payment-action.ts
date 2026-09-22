// src/features/payments/create-payment-action.ts
"use server";

import { createPayment } from "@/application/payments/create-payment";
import { getAuthenticatedContractContext } from "@/features/contracts/authenticated-contract-context";
import { getInvoiceOnContract } from "@/features/invoices/contract-invoice-access";
import { invoiceDetailPath } from "@/features/invoices/invoice-display";
import { mapPaymentWriteError } from "@/features/payments/payment-action-errors";
import {
  readPaymentFormValues,
  toPaymentCreateInput,
  type PaymentFormActionState,
} from "@/features/payments/payment-form-state";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPaymentAction(
  contractId: string,
  invoiceId: string,
  _previousState: PaymentFormActionState,
  formData: FormData,
): Promise<PaymentFormActionState> {
  const { context, contracts, invoices, payments, runInTransaction } =
    await getAuthenticatedContractContext();
  const values = readPaymentFormValues(formData);

  try {
    await getInvoiceOnContract(
      context,
      contractId,
      invoiceId,
      contracts,
      invoices,
      payments,
    );
    await createPayment(
      context,
      toPaymentCreateInput(invoiceId, values),
      runInTransaction,
    );
  } catch (error) {
    return mapPaymentWriteError(error, values, "create");
  }

  revalidatePaymentSurfaces(contractId, invoiceId);
  redirect(invoiceDetailPath(contractId, invoiceId));
}

function revalidatePaymentSurfaces(contractId: string, invoiceId: string): void {
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath(invoiceDetailPath(contractId, invoiceId));
  revalidatePath("/alerts");
  revalidatePath("/", "layout");
}
