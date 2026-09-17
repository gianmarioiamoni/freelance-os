// src/features/time-entries/create-time-entry-action.ts
"use server";

import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { ClientArchivedError } from "@/domain/contract-errors";
import { ClientNotFoundError } from "@/domain/client-errors";
import { ContractNotFoundError } from "@/domain/contract-errors";
import {
  InvalidDurationError,
  InvalidTimeEntryInputError,
  ContractNotValidForDateError,
} from "@/domain/time-entry-errors";
import { getAuthenticatedTimeEntryContext } from "@/features/time-entries/authenticated-time-entry-context";
import { triggerAlertEvaluation } from "@/features/time-entries/trigger-alert-evaluation";
import {
  TIME_ENTRY_ARCHIVED_CLIENT_ERROR,
  TIME_ENTRY_CONTRACT_NOT_VALID_ERROR,
  TIME_ENTRY_FIELD_ERROR_MESSAGES,
  readTimeEntryFormValues,
  parseDurationFromForm,
  type TimeEntryFormActionState,
} from "@/features/time-entries/time-entry-form-state";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTimeEntryAction(
  _previousState: TimeEntryFormActionState,
  formData: FormData,
): Promise<TimeEntryFormActionState> {
  const { context, clients, contracts, timeEntries, alerts, notifications, members, settings, analytics } =
    await getAuthenticatedTimeEntryContext();
  const values = readTimeEntryFormValues(formData);

  try {
    const workDate = new Date(values.workDate + "T00:00:00.000Z");
    const durationMinutes = parseDurationFromForm(values.durationHours, values.durationMinutes);

    await createTimeEntry(
      context,
      {
        clientId: values.clientId,
        contractId: values.contractId,
        workDate,
        durationMinutes,
        description: values.description || null,
        billable: values.billable,
      },
      clients,
      contracts,
      timeEntries,
    );

    // P106-03: trigger alert evaluation after successful TimeEntry creation (best-effort).
    await triggerAlertEvaluation(context, { alerts, notifications, members, settings, analytics });
  } catch (error) {
    if (error instanceof InvalidTimeEntryInputError) {
      return {
        error: TIME_ENTRY_FIELD_ERROR_MESSAGES[error.field],
        field: error.field,
        values,
      };
    }

    if (error instanceof InvalidDurationError) {
      return {
        error: TIME_ENTRY_FIELD_ERROR_MESSAGES["durationMinutes"],
        field: "durationMinutes",
        values,
      };
    }

    if (error instanceof ClientArchivedError) {
      return {
        error: TIME_ENTRY_ARCHIVED_CLIENT_ERROR,
        field: "clientId",
        values,
      };
    }

    if (error instanceof ContractNotValidForDateError) {
      return {
        error: TIME_ENTRY_CONTRACT_NOT_VALID_ERROR,
        field: "contractId",
        values,
      };
    }

    if (error instanceof ContractNotFoundError || error instanceof ClientNotFoundError) {
      return {
        error: "Selected client or contract not found.",
        field: "contractId",
        values,
      };
    }

    return {
      error: "Unable to create the time entry.",
      values,
    };
  }

  // Revalidate affected RSC routes after persistence + alert evaluation.
  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/alerts");

  // Redirect outside the try block: redirect() signals via a thrown
  // NEXT_REDIRECT error that must not be caught by the handler above.
  redirect(`/time-tracking?date=${values.workDate}`);
}