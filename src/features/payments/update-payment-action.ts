// src/features/payments/update-payment-action.ts
"use server";

import { updatePayment } from "@/application/payments/update-payment";
import { getAuthenticatedContractContext } from "@/features/contracts/authenticated-contract-context";
import { getInvoiceOnContract } from "@/features/invoices/contract-invoice-access";
import { invoiceDetailPath } from "@/features/invoices/invoice-display";
import { mapPaymentWriteError } from "@/features/payments/payment-action-errors";
import {
  readPaymentFormValues,
  toPaymentUpdateInput,
  type PaymentFormActionState,
} from "@/features/payments/payment-form-state";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updatePaymentAction(
  contractId: string,
  invoiceId: string,
  paymentId: string,
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
    await updatePayment(
      context,
      invoiceId,
      paymentId,
      toPaymentUpdateInput(values),
      runInTransaction,
    );
  } catch (error) {
    return mapPaymentWriteError(error, values, "update");
  }

  revalidatePath(`/contracts/${contractId}`);
  revalidatePath(invoiceDetailPath(contractId, invoiceId));
  revalidatePath("/alerts");
  revalidatePath("/", "layout");
  redirect(invoiceDetailPath(contractId, invoiceId));
}
