// src/application/time-entries/list-time-entries.ts
import type { TimeEntryRecord } from "@/domain/persistence-types";
import type { TimeEntryRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

export async function listTimeEntriesForDate(
  context: WorkspaceContext,
  workDate: Date,
  timeEntries: TimeEntryRepository,
): Promise<TimeEntryRecord[]> {
  return await timeEntries.listTimeEntriesForDate(context.workspaceId, workDate);
}

export async function listTimeEntriesForPeriod(
  context: WorkspaceContext,
  startDate: Date,
  endDate: Date,
  timeEntries: TimeEntryRepository,
): Promise<TimeEntryRecord[]> {
  return await timeEntries.listTimeEntriesForPeriod(context.workspaceId, startDate, endDate);
}