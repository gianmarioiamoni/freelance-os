// src/features/clients/ClientForm.tsx
"use client";

import { Field } from "@/components/forms/Field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CLIENT_FORM_FIELDS,
  EMPTY_CLIENT_FORM_VALUES,
  type ClientFormAction,
  type ClientFormActionState,
  type ClientFormValues,
} from "@/features/clients/client-form-state";
import { useActionState, type JSX } from "react";

type ClientFormProps = {
  action: ClientFormAction;
  defaultValues?: ClientFormValues;
  submitLabel: string;
  pendingLabel: string;
};

const INITIAL_STATE: ClientFormActionState = null;

export function ClientForm({
  action,
  defaultValues = EMPTY_CLIENT_FORM_VALUES,
  submitLabel,
  pendingLabel,
}: ClientFormProps): JSX.Element {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const values = state?.values ?? defaultValues;

  return (
    <form className="grid gap-4" action={formAction}>
      {state?.error && !state.field ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to save</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {CLIENT_FORM_FIELDS.map((field) => (
        <Field
          key={field.name}
          label={field.label}
          htmlFor={field.name}
          error={state?.field === field.name ? state.error : undefined}
        >
          <Input
            name={field.name}
            type="text"
            required={"required" in field ? field.required : undefined}
            maxLength={"maxLength" in field ? field.maxLength : undefined}
            autoComplete={
              "autoComplete" in field ? field.autoComplete : undefined
            }
            defaultValue={values[field.name]}
            disabled={isPending}
          />
        </Field>
      ))}
      <Button type="submit" disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
