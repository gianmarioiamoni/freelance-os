// src/features/invoices/void-invoice-action.ts
"use server";

import { voidInvoice } from "@/application/invoices/void-invoice";
import { getAuthenticatedContractContext } from "@/features/contracts/authenticated-contract-context";
import { getInvoiceOnContract } from "@/features/invoices/contract-invoice-access";
import { mapInvoiceVoidError } from "@/features/invoices/invoice-action-errors";
import { invoiceDetailPath } from "@/features/invoices/invoice-display";
import { redirect } from "next/navigation";

export type VoidInvoiceActionState = {
  error: string;
} | null;

export async function voidInvoiceAction(
  contractId: string,
  invoiceId: string,
  _previousState: VoidInvoiceActionState,
  formData: FormData,
): Promise<VoidInvoiceActionState> {
  if (formData.get("confirm") !== "void") {
    return { error: "Confirm that you want to void this invoice." };
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
    await runInTransaction(async (tx) => {
      await voidInvoice(context, invoiceId, tx.invoices, tx.alerts);
    });
  } catch (error) {
    return mapInvoiceVoidError(error);
  }

  redirect(invoiceDetailPath(contractId, invoiceId));
}
