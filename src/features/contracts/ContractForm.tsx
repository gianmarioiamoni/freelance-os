// src/features/contracts/ContractForm.tsx
"use client";

import { Field } from "@/components/forms/Field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContractClientField } from "@/features/contracts/ContractClientField";
import {
  CONTRACT_SELECT_CLASS_NAME,
  CONTRACT_TEXTAREA_CLASS_NAME,
} from "@/features/contracts/contract-form-controls";
import {
  EMPTY_CONTRACT_FORM_VALUES,
  PAYMENT_TERMS_NOTE_MAX_LENGTH,
  type ContractFormAction,
  type ContractFormActionState,
  type ContractFormValues,
} from "@/features/contracts/contract-form-state";
import { useActionState, type JSX } from "react";

type ContractFormProps = {
  action: ContractFormAction;
  defaultValues?: ContractFormValues;
  submitLabel: string;
  pendingLabel: string;
  currencies: string[];
  clients?: Array<{ id: string; companyName: string }>;
  lockedClient?: { id: string; companyName: string };
  clientName?: string;
};

const INITIAL_STATE: ContractFormActionState = null;

export function ContractForm({
  action,
  defaultValues = EMPTY_CONTRACT_FORM_VALUES,
  submitLabel,
  pendingLabel,
  currencies,
  clients = [],
  lockedClient,
  clientName,
}: ContractFormProps): JSX.Element {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const values = state?.values ?? defaultValues;
  const fieldError = (field: keyof ContractFormValues) =>
    state?.field === field ? state.error : undefined;

  return (
    <form
      key={
        state
          ? `${state.field ?? "form"}:${state.error}:${values.clientId}:${values.billingModel}:${values.currency}`
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
      <ContractClientField
        clientName={clientName}
        lockedClient={lockedClient}
        clients={clients}
        clientId={values.clientId}
        error={fieldError("clientId")}
        isPending={isPending}
      />
      <Field label="Valid from" htmlFor="validFrom" error={fieldError("validFrom")}>
        <Input
          name="validFrom"
          type="date"
          required
          defaultValue={values.validFrom}
          disabled={isPending}
        />
      </Field>
      <Field
        label="Valid to"
        htmlFor="validTo"
        hint="Leave empty for an open-ended contract."
        error={fieldError("validTo")}
      >
        <Input
          name="validTo"
          type="date"
          defaultValue={values.validTo}
          disabled={isPending}
        />
      </Field>
      <Field
        label="Billing model"
        htmlFor="billingModel"
        error={fieldError("billingModel")}
      >
        <select
          name="billingModel"
          required
          defaultValue={values.billingModel}
          disabled={isPending}
          className={CONTRACT_SELECT_CLASS_NAME}
        >
          <option value="" disabled>
            Select a billing model
          </option>
          <option value="HOURLY">Hourly</option>
          <option value="DAILY">Daily</option>
        </select>
      </Field>
      <Field label="Rate" htmlFor="rate" error={fieldError("rate")}>
        <Input
          name="rate"
          type="text"
          inputMode="decimal"
          required
          defaultValue={values.rate}
          disabled={isPending}
        />
      </Field>
      <Field label="Currency" htmlFor="currency" error={fieldError("currency")}>
        <select
          name="currency"
          required
          defaultValue={values.currency}
          disabled={isPending}
          className={CONTRACT_SELECT_CLASS_NAME}
        >
          <option value="" disabled>
            Select a currency
          </option>
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Monthly contracted hours"
        htmlFor="monthlyContractedHours"
        hint="Optional. Leave empty for no monthly limit."
        error={fieldError("monthlyContractedHours")}
      >
        <Input
          name="monthlyContractedHours"
          type="text"
          inputMode="decimal"
          defaultValue={values.monthlyContractedHours}
          disabled={isPending}
        />
      </Field>
      <Field
        label="Payment terms (days)"
        htmlFor="paymentTermsDays"
        error={fieldError("paymentTermsDays")}
      >
        <Input
          name="paymentTermsDays"
          type="text"
          inputMode="numeric"
          defaultValue={values.paymentTermsDays}
          disabled={isPending}
        />
      </Field>
      <Field
        label="Payment terms note"
        htmlFor="paymentTermsNote"
        error={fieldError("paymentTermsNote")}
      >
        <textarea
          name="paymentTermsNote"
          maxLength={PAYMENT_TERMS_NOTE_MAX_LENGTH}
          defaultValue={values.paymentTermsNote}
          disabled={isPending}
          className={CONTRACT_TEXTAREA_CLASS_NAME}
        />
      </Field>
      <Button type="submit" disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
