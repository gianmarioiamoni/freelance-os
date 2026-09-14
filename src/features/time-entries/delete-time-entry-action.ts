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
    
    // Redirect back to the time tracking page
    const dateParam = workDate ? `?date=${workDate}` : "";
    redirect(`/time-tracking${dateParam}`);
  } catch (error) {
    if (error instanceof TimeEntryNotFoundError) {
      // Redirect back even if not found (prevents error loops)
      const dateParam = workDate ? `?date=${workDate}` : "";
      redirect(`/time-tracking${dateParam}`);
    }

    // For other errors, let them bubble up
    throw error;
  }
}