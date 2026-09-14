// src/application/time-entries/update-time-entry.ts
import type { TimeEntryRecord, UpdateTimeEntryInput } from "@/domain/persistence-types";
import type { TimeEntryRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { validateUpdateTimeEntryInput } from "@/application/time-entries/time-entry-input";
import { TimeEntryNotFoundError } from "@/domain/time-entry-errors";

export async function updateTimeEntry(
  context: WorkspaceContext,
  timeEntryId: string,
  input: UpdateTimeEntryInput,
  timeEntries: TimeEntryRepository,
): Promise<TimeEntryRecord> {
  // Validate input
  validateUpdateTimeEntryInput(input);

  // Verify the time entry exists and belongs to the workspace
  const existingEntry = await timeEntries.getTimeEntry(context.workspaceId, timeEntryId);
  if (!existingEntry) {
    throw new TimeEntryNotFoundError();
  }

  // Update the time entry (only mutable fields)
  return await timeEntries.updateTimeEntry(context.workspaceId, timeEntryId, input);
}