// src/application/time-entries/get-time-entry.ts
import type { TimeEntryRecord } from "@/domain/persistence-types";
import type { TimeEntryRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { TimeEntryNotFoundError } from "@/domain/time-entry-errors";

export async function getTimeEntry(
  context: WorkspaceContext,
  timeEntryId: string,
  timeEntries: TimeEntryRepository,
): Promise<TimeEntryRecord> {
  const timeEntry = await timeEntries.getTimeEntry(context.workspaceId, timeEntryId);
  
  if (!timeEntry) {
    throw new TimeEntryNotFoundError();
  }

  return timeEntry;
}