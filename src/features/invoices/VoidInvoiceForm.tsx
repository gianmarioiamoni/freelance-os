// src/features/invoices/VoidInvoiceForm.tsx
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  voidInvoiceAction,
  type VoidInvoiceActionState,
} from "@/features/invoices/void-invoice-action";
import { invoiceDetailPath } from "@/features/invoices/invoice-display";
import Link from "next/link";
import { useActionState, type JSX } from "react";

type VoidInvoiceFormProps = {
  contractId: string;
  invoiceId: string;
};

const INITIAL_STATE: VoidInvoiceActionState = null;

export function VoidInvoiceForm({
  contractId,
  invoiceId,
}: VoidInvoiceFormProps): JSX.Element {
  const action = voidInvoiceAction.bind(null, contractId, invoiceId);
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);

  return (
    <form className="grid gap-3" action={formAction}>
      <Alert>
        <AlertTitle>Void this invoice?</AlertTitle>
        <AlertDescription>
          Voiding keeps the invoice readable in the void view. This cannot be
          undone from the application.
        </AlertDescription>
      </Alert>
      {state?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to void</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <input type="hidden" name="confirm" value="void" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={isPending}>
          {isPending ? "Voiding…" : "Confirm void"}
        </Button>
        <Button asChild variant="outline">
          <Link href={invoiceDetailPath(contractId, invoiceId)}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
