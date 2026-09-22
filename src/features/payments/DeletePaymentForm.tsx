// src/features/payments/DeletePaymentForm.tsx
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  deletePaymentAction,
  type DeletePaymentActionState,
} from "@/features/payments/delete-payment-action";
import { invoiceDetailPath } from "@/features/invoices/invoice-display";
import Link from "next/link";
import { useActionState, type JSX } from "react";

type DeletePaymentFormProps = {
  contractId: string;
  invoiceId: string;
  paymentId: string;
};

const INITIAL_STATE: DeletePaymentActionState = null;

export function DeletePaymentForm({
  contractId,
  invoiceId,
  paymentId,
}: DeletePaymentFormProps): JSX.Element {
  const action = deletePaymentAction.bind(null, contractId, invoiceId, paymentId);
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);

  return (
    <form className="grid gap-3" action={formAction}>
      <Alert>
        <AlertTitle>Delete this payment?</AlertTitle>
        <AlertDescription>
          This removes the payment event. It does not create a reversal or
          credit. The invoice paid amount will be recalculated.
        </AlertDescription>
      </Alert>
      {state?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to delete</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <input type="hidden" name="confirm" value="delete-payment" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={isPending}>
          {isPending ? "Deleting…" : "Delete payment"}
        </Button>
        <Button asChild variant="outline">
          <Link href={invoiceDetailPath(contractId, invoiceId)}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
