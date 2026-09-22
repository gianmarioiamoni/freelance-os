// src/features/invoices/create-invoice-action.ts
"use server";

import { createInvoice } from "@/application/invoices/create-invoice";
import { getAuthenticatedContractContext } from "@/features/contracts/authenticated-contract-context";
import { mapInvoiceWriteError } from "@/features/invoices/invoice-action-errors";
import { invoiceDetailPath } from "@/features/invoices/invoice-display";
import {
  readInvoiceFormValues,
  toInvoiceCreateInput,
  type InvoiceFormActionState,
} from "@/features/invoices/invoice-form-state";
import { redirect } from "next/navigation";

export async function createInvoiceAction(
  contractId: string,
  _previousState: InvoiceFormActionState,
  formData: FormData,
): Promise<InvoiceFormActionState> {
  const { context, contracts, invoices } = await getAuthenticatedContractContext();
  const values = readInvoiceFormValues(formData);

  let invoiceId: string;

  try {
    const invoice = await createInvoice(
      context,
      toInvoiceCreateInput(contractId, values),
      contracts,
      invoices,
    );
    invoiceId = invoice.id;
  } catch (error) {
    return mapInvoiceWriteError(error, values, "create");
  }

  redirect(invoiceDetailPath(contractId, invoiceId));
}
