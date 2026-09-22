// src/features/invoices/update-invoice-action.ts
"use server";

import { updateInvoice } from "@/application/invoices/update-invoice";
import { getAuthenticatedContractContext } from "@/features/contracts/authenticated-contract-context";
import { getInvoiceOnContract } from "@/features/invoices/contract-invoice-access";
import { mapInvoiceWriteError } from "@/features/invoices/invoice-action-errors";
import { invoiceDetailPath } from "@/features/invoices/invoice-display";
import {
  readInvoiceFormValues,
  toInvoiceUpdateInput,
  type InvoiceFormActionState,
} from "@/features/invoices/invoice-form-state";
import { redirect } from "next/navigation";

export async function updateInvoiceAction(
  contractId: string,
  invoiceId: string,
  _previousState: InvoiceFormActionState,
  formData: FormData,
): Promise<InvoiceFormActionState> {
  const { context, contracts, invoices } = await getAuthenticatedContractContext();
  const values = readInvoiceFormValues(formData);

  try {
    await getInvoiceOnContract(
      context,
      contractId,
      invoiceId,
      contracts,
      invoices,
    );
    await updateInvoice(
      context,
      invoiceId,
      toInvoiceUpdateInput(values),
      invoices,
    );
  } catch (error) {
    return mapInvoiceWriteError(error, values, "update");
  }

  redirect(invoiceDetailPath(contractId, invoiceId));
}
