// src/features/invoices/InvoiceForm.tsx
"use client";

import { Field } from "@/components/forms/Field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { displayPaymentTerms } from "@/features/contracts/contract-display";
import { previewDueDate } from "@/features/invoices/invoice-display";
import {
  EMPTY_INVOICE_FORM_VALUES,
  type InvoiceFormAction,
  type InvoiceFormActionState,
  type InvoiceFormValues,
} from "@/features/invoices/invoice-form-state";
import { INVOICE_REFERENCE_MAX_LENGTH } from "@/domain/invoice";
import { useActionState, useState, type JSX } from "react";

type InvoiceFormProps = {
  action: InvoiceFormAction;
  defaultValues?: InvoiceFormValues;
  submitLabel: string;
  pendingLabel: string;
  currency: string;
  paymentTermsDays: number | null;
  paymentTermsNote?: string | null;
};

const INITIAL_STATE: InvoiceFormActionState = null;

export function InvoiceForm({
  action,
  defaultValues = EMPTY_INVOICE_FORM_VALUES,
  submitLabel,
  pendingLabel,
  currency,
  paymentTermsDays,
  paymentTermsNote = null,
}: InvoiceFormProps): JSX.Element {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const values = state?.values ?? defaultValues;
  const [invoiceDate, setInvoiceDate] = useState(values.invoiceDate);
  const fieldError = (field: keyof InvoiceFormValues) =>
    state?.field === field ? state.error : undefined;
  const derivedDueDate = previewDueDate(invoiceDate, paymentTermsDays);

  return (
    <form
      key={
        state
          ? `${state.field ?? "form"}:${state.error}:${values.invoiceDate}`
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
        label="Invoice date"
        htmlFor="invoiceDate"
        error={fieldError("invoiceDate")}
      >
        <Input
          name="invoiceDate"
          type="date"
          required
          value={invoiceDate}
          onChange={(event) => setInvoiceDate(event.target.value)}
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
      <Field label="Currency" htmlFor="invoiceCurrency">
        <output className="block">{currency}</output>
      </Field>
      <Field
        label="Reference"
        htmlFor="reference"
        hint="Optional."
        error={fieldError("reference")}
      >
        <Input
          name="reference"
          type="text"
          maxLength={INVOICE_REFERENCE_MAX_LENGTH}
          defaultValue={values.reference}
          disabled={isPending}
        />
      </Field>
      <Field label="Payment terms" htmlFor="invoicePaymentTerms">
        <output className="block">
          {displayPaymentTerms(paymentTermsDays, paymentTermsNote)}
        </output>
      </Field>
      <div aria-live="polite">
        <Field label="Due date" htmlFor="invoiceDueDate">
          <output className="block">
            {paymentTermsDays === null
              ? "No due date"
              : (derivedDueDate ?? "Derived after you enter an invoice date")}
          </output>
        </Field>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
