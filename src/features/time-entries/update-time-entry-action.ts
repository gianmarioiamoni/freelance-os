// src/features/time-entries/update-time-entry-action.ts
"use server";

import { updateTimeEntry } from "@/application/time-entries/update-time-entry";
import {
  InvalidDurationError,
  InvalidTimeEntryInputError,
  TimeEntryNotFoundError,
} from "@/domain/time-entry-errors";
import { getAuthenticatedTimeEntryContext } from "@/features/time-entries/authenticated-time-entry-context";
import { triggerAlertEvaluation } from "@/features/time-entries/trigger-alert-evaluation";
import {
  TIME_ENTRY_FIELD_ERROR_MESSAGES,
  TIME_ENTRY_NOT_FOUND_ERROR,
  readTimeEntryFormValues,
  parseDurationFromForm,
  type TimeEntryFormActionState,
} from "@/features/time-entries/time-entry-form-state";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateTimeEntryAction(
  timeEntryId: string,
  _previousState: TimeEntryFormActionState,
  formData: FormData,
): Promise<TimeEntryFormActionState> {
  const { context, timeEntries, alerts, notifications, members, settings, analytics } =
    await getAuthenticatedTimeEntryContext();
  const values = readTimeEntryFormValues(formData);

  try {
    const durationMinutes = parseDurationFromForm(values.durationHours, values.durationMinutes);

    const updated = await updateTimeEntry(
      context,
      timeEntryId,
      {
        durationMinutes,
        description: values.description || null,
        billable: values.billable,
      },
      timeEntries,
    );

    await triggerAlertEvaluation(
      context,
      { alerts, notifications, members, settings, analytics },
      updated.contractId,
    );
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

    if (error instanceof TimeEntryNotFoundError) {
      return {
        error: TIME_ENTRY_NOT_FOUND_ERROR,
        values,
      };
    }

    return {
      error: "Unable to update the time entry.",
      values,
    };
  }

  // Revalidate affected RSC routes after persistence + alert evaluation.
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/alerts");

  // Redirect outside the try block: redirect() signals via a thrown
  // NEXT_REDIRECT error that must not be caught by the handler above.
  redirect(`/time-tracking?date=${values.workDate}`);
}