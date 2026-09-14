// src/features/time-entries/delete-time-entry-action.ts
"use server";

import { deleteTimeEntry } from "@/application/time-entries/delete-time-entry";
import { TimeEntryNotFoundError } from "@/domain/time-entry-errors";
import { getAuthenticatedTimeEntryContext } from "@/features/time-entries/authenticated-time-entry-context";
import { redirect } from "next/navigation";

export async function deleteTimeEntryAction(timeEntryId: string, workDate?: string): Promise<void> {
  const { context, timeEntries } = await getAuthenticatedTimeEntryContext();

  try {
    await deleteTimeEntry(context, timeEntryId, timeEntries);
  } catch (error) {
    // Deleting an already-missing entry is treated as success to prevent
    // error loops; any other failure bubbles up.
    if (!(error instanceof TimeEntryNotFoundError)) {
      throw error;
    }
  }

  // Redirect outside the try block: redirect() signals via a thrown
  // NEXT_REDIRECT error that must not be caught by the handler above.
  const dateParam = workDate ? `?date=${workDate}` : "";
  redirect(`/time-tracking${dateParam}`);
}