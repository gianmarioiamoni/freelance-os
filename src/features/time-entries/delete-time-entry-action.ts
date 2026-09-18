// src/features/time-entries/delete-time-entry-action.ts
"use server";

import { deleteTimeEntry } from "@/application/time-entries/delete-time-entry";
import { TimeEntryNotFoundError } from "@/domain/time-entry-errors";
import { getAuthenticatedTimeEntryContext } from "@/features/time-entries/authenticated-time-entry-context";
import { triggerAlertEvaluation } from "@/features/time-entries/trigger-alert-evaluation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteTimeEntryAction(timeEntryId: string, workDate?: string): Promise<void> {
  const { context, timeEntries, alerts, notifications, members, settings, analytics } =
    await getAuthenticatedTimeEntryContext();

  try {
    await deleteTimeEntry(context, timeEntryId, timeEntries);

    // P106-03: trigger alert evaluation after successful TimeEntry deletion (best-effort).
    await triggerAlertEvaluation(context, { alerts, notifications, members, settings, analytics });
  } catch (error) {
    // Deleting an already-missing entry is treated as success to prevent
    // error loops; any other failure bubbles up.
    if (!(error instanceof TimeEntryNotFoundError)) {
      throw error;
    }
  }

  // Revalidate affected RSC routes after persistence + alert evaluation.
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/alerts");

  // Redirect outside the try block: redirect() signals via a thrown
  // NEXT_REDIRECT error that must not be caught by the handler above.
  const dateParam = workDate ? `?date=${workDate}` : "";
  redirect(`/time-tracking${dateParam}`);
}