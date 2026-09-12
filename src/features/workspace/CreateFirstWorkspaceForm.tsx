// src/features/workspace/CreateFirstWorkspaceForm.tsx
"use client";

import { WORKSPACE_NAME_MAX_LENGTH } from "@/application/workspace/workspace-creation-input";
import { Button } from "@/components/ui/button";
import {
  createFirstWorkspaceAction,
  type CreateFirstWorkspaceActionState,
} from "@/features/workspace/create-first-workspace-action";
import { useActionState, type JSX } from "react";

type CreateFirstWorkspaceFormProps = {
  timezones: string[];
  currencies: string[];
};

const INITIAL_STATE: CreateFirstWorkspaceActionState = null;

export function CreateFirstWorkspaceForm({
  timezones,
  currencies,
}: CreateFirstWorkspaceFormProps): JSX.Element {
  const [state, formAction, isPending] = useActionState(
    createFirstWorkspaceAction,
    INITIAL_STATE,
  );

  return (
    <form className="flex flex-col gap-4" action={formAction}>
      <div className="flex flex-col gap-1">
        <h1>Create your workspace</h1>
        <p className="text-sm text-muted-foreground">
          Set up the workspace you will use in FreelanceOS.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="name">Workspace name</label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="organization"
          required
          maxLength={WORKSPACE_NAME_MAX_LENGTH}
          disabled={isPending}
          aria-invalid={state?.field === "name"}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="timezone">Timezone</label>
        <select
          id="timezone"
          name="timezone"
          required
          disabled={isPending}
          defaultValue=""
          aria-invalid={state?.field === "timezone"}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select a timezone
          </option>
          {timezones.map((timezone) => (
            <option key={timezone} value={timezone}>
              {timezone}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="currency">Currency</label>
        <select
          id="currency"
          name="currency"
          required
          disabled={isPending}
          defaultValue=""
          aria-invalid={state?.field === "currency"}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating workspace…" : "Create workspace"}
      </Button>
    </form>
  );
}
