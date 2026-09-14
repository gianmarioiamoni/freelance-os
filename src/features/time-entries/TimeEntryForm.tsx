// src/features/time-entries/TimeEntryForm.tsx
"use client";

import { Field } from "@/components/forms/Field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientContractSelector } from "@/features/time-entries/ClientContractSelector";
import { DurationInput } from "@/features/time-entries/DurationInput";
import {
  EMPTY_TIME_ENTRY_FORM_VALUES,
  type TimeEntryFormAction,
  type TimeEntryFormActionState,
  type TimeEntryFormValues,
} from "@/features/time-entries/time-entry-form-state";
import type { ClientRecord, ContractRecord } from "@/domain/persistence-types";
import { useActionState, type JSX } from "react";

type TimeEntryFormProps = {
  action: TimeEntryFormAction;
  defaultValues?: TimeEntryFormValues;
  submitLabel: string;
  pendingLabel: string;
  clients: ClientRecord[];
  contracts: ContractRecord[];
  isEdit?: boolean;
  clientName?: string;
  contractDescription?: string;
};

const INITIAL_STATE: TimeEntryFormActionState = null;
const TEXTAREA_CLASS_NAME = "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function TimeEntryForm({
  action,
  defaultValues = EMPTY_TIME_ENTRY_FORM_VALUES,
  submitLabel,
  pendingLabel,
  clients,
  contracts,
  isEdit = false,
  clientName,
  contractDescription,
}: TimeEntryFormProps): JSX.Element {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const values = state?.values ?? defaultValues;
  const fieldError = (field: keyof TimeEntryFormValues) =>
    state?.field === field ? state.error : undefined;

  return (
    <form
      key={
        state
          ? `${state.field ?? "form"}:${state.error}:${values.clientId}:${values.contractId}`
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

      <ClientContractSelector
        clients={clients}
        contracts={contracts}
        selectedClientId={values.clientId}
        selectedContractId={values.contractId}
        workDate={values.workDate}
        clientError={fieldError("clientId")}
        contractError={fieldError("contractId")}
        disabled={isPending}
        isEdit={isEdit}
        clientName={clientName}
        contractDescription={contractDescription}
      />

      <Field
        label="Work date"
        htmlFor="workDate"
        error={fieldError("workDate")}
      >
        {isEdit ? (
          <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
            {new Date(values.workDate + "T00:00:00.000Z").toLocaleDateString()}
          </div>
        ) : (
          <Input
            id="workDate"
            name="workDate"
            type="date"
            required
            defaultValue={values.workDate}
            disabled={isPending}
          />
        )}
      </Field>

      <DurationInput
        hoursName="durationHours"
        minutesName="durationMinutes"
        defaultHours={values.durationHours}
        defaultMinutes={values.durationMinutes}
        error={fieldError("durationMinutes")}
        disabled={isPending}
      />

      <Field
        label="Description"
        htmlFor="description"
        hint="Optional. Describe the work performed."
        error={fieldError("description")}
      >
        <textarea
          id="description"
          name="description"
          placeholder="Describe the work performed..."
          defaultValue={values.description}
          disabled={isPending}
          className={TEXTAREA_CLASS_NAME}
          rows={3}
        />
      </Field>

      <Field
        label="Billable"
        htmlFor="billable"
        error={fieldError("billable")}
      >
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="billable"
              value="true"
              defaultChecked={values.billable}
              disabled={isPending}
            />
            <span>Billable</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="billable"
              value="false"
              defaultChecked={!values.billable}
              disabled={isPending}
            />
            <span>Non-billable</span>
          </label>
        </div>
      </Field>

      <Button type="submit" disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}