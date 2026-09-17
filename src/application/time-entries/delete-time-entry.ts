// src/application/time-entries/delete-time-entry.ts
import type { TimeEntryRecord } from "@/domain/persistence-types";
import type { TimeEntryRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { TimeEntryNotFoundError } from "@/domain/time-entry-errors";

export async function deleteTimeEntry(
  context: WorkspaceContext,
  timeEntryId: string,
  timeEntries: TimeEntryRepository,
): Promise<TimeEntryRecord> {
  // Verify the time entry exists and belongs to the workspace
  const existingEntry = await timeEntries.getTimeEntry(context.workspaceId, timeEntryId);
  if (!existingEntry) {
    throw new TimeEntryNotFoundError();
  }

  // Hard delete the time entry
  await timeEntries.deleteTimeEntry(context.workspaceId, timeEntryId);

  // Return the deleted entry so callers can access contractId for alert evaluation.
  return existingEntry;
}