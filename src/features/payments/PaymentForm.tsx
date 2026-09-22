// src/features/payments/PaymentForm.tsx
"use client";

import { PAYMENT_NOTES_MAX_LENGTH } from "@/application/payments/payment-input";
import { Field } from "@/components/forms/Field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EMPTY_PAYMENT_FORM_VALUES,
  type PaymentFormAction,
  type PaymentFormActionState,
  type PaymentFormValues,
} from "@/features/payments/payment-form-state";
import { useActionState, type JSX } from "react";

type PaymentFormProps = {
  action: PaymentFormAction;
  defaultValues?: PaymentFormValues;
  submitLabel: string;
  pendingLabel: string;
  currency: string;
};

const INITIAL_STATE: PaymentFormActionState = null;

export function PaymentForm({
  action,
  defaultValues = EMPTY_PAYMENT_FORM_VALUES,
  submitLabel,
  pendingLabel,
  currency,
}: PaymentFormProps): JSX.Element {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const values = state?.values ?? defaultValues;
  const fieldError = (field: keyof PaymentFormValues) =>
    state?.field === field ? state.error : undefined;

  return (
    <form
      key={
        state
          ? `${state.field ?? "form"}:${state.error}:${values.paymentDate}`
          : "pristine"
      }
      className="grid gap-4"
      action={formAction}
      autoComplete="off"
    >
      {state?.error && !state.field ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to save</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Field
        label="Payment date"
        htmlFor="paymentDate"
        error={fieldError("paymentDate")}
      >
        <Input
          name="paymentDate"
          type="date"
          required
          defaultValue={values.paymentDate}
          disabled={isPending}
        />
      </Field>
      <Field
        label="Amount"
        htmlFor="amount"
        hint={`Recorded in ${currency}.`}
        error={fieldError("amount")}
      >
        <Input
          name="amount"
          type="text"
          inputMode="decimal"
          required
          defaultValue={values.amount}
          disabled={isPending}
        />
      </Field>
      <Field label="Currency" htmlFor="paymentCurrency">
        <output id="paymentCurrency" className="block">
          {currency}
        </output>
      </Field>
      <Field
        label="Notes"
        htmlFor="notes"
        hint="Optional."
        error={fieldError("notes")}
      >
        <textarea
          id="notes"
          name="notes"
          maxLength={PAYMENT_NOTES_MAX_LENGTH}
          defaultValue={values.notes}
          disabled={isPending}
          rows={3}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
      </Field>
      <Button type="submit" disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
