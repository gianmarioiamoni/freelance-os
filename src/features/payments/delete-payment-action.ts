// src/features/payments/delete-payment-action.ts
"use server";

import { deletePayment } from "@/application/payments/delete-payment";
import { getAuthenticatedContractContext } from "@/features/contracts/authenticated-contract-context";
import { getInvoiceOnContract } from "@/features/invoices/contract-invoice-access";
import { invoiceDetailPath } from "@/features/invoices/invoice-display";
import { mapPaymentDeleteError } from "@/features/payments/payment-action-errors";
import { PAYMENT_DELETE_CONFIRM_ERROR } from "@/features/payments/payment-form-state";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type DeletePaymentActionState = {
  error: string;
} | null;

export async function deletePaymentAction(
  contractId: string,
  invoiceId: string,
  paymentId: string,
  _previousState: DeletePaymentActionState,
  formData: FormData,
): Promise<DeletePaymentActionState> {
  if (formData.get("confirm") !== "delete-payment") {
    return { error: PAYMENT_DELETE_CONFIRM_ERROR };
  }

  const { context, contracts, invoices, payments, runInTransaction } =
    await getAuthenticatedContractContext();

  try {
    await getInvoiceOnContract(
      context,
      contractId,
      invoiceId,
      contracts,
      invoices,
      payments,
    );
    await deletePayment(context, invoiceId, paymentId, runInTransaction);
  } catch (error) {
    return mapPaymentDeleteError(error);
  }

  revalidatePath(`/contracts/${contractId}`);
  revalidatePath(invoiceDetailPath(contractId, invoiceId));
  revalidatePath("/alerts");
  revalidatePath("/", "layout");
  redirect(invoiceDetailPath(contractId, invoiceId));
}
