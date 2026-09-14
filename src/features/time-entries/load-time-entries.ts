// src/features/time-entries/load-time-entries.ts
import { listTimeEntriesForDate, listTimeEntriesForPeriod } from "@/application/time-entries/list-time-entries";
import { getTimeEntry } from "@/application/time-entries/get-time-entry";
import type { TimeEntryRecord } from "@/domain/persistence-types";
import { getAuthenticatedTimeEntryContext } from "@/features/time-entries/authenticated-time-entry-context";

export async function loadTimeEntriesForDate(date: Date): Promise<TimeEntryRecord[]> {
  const { context, timeEntries } = await getAuthenticatedTimeEntryContext();
  return await listTimeEntriesForDate(context, date, timeEntries);
}

export async function loadTimeEntriesForWeek(startDate: Date): Promise<TimeEntryRecord[]> {
  const { context, timeEntries } = await getAuthenticatedTimeEntryContext();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6); // 7 days total
  return await listTimeEntriesForPeriod(context, startDate, endDate, timeEntries);
}

export async function loadTimeEntry(timeEntryId: string): Promise<TimeEntryRecord> {
  const { context, timeEntries } = await getAuthenticatedTimeEntryContext();
  return await getTimeEntry(context, timeEntryId, timeEntries);
}

export async function loadClientsAndContracts() {
  const { context, clients, contracts } = await getAuthenticatedTimeEntryContext();
  
  const allClients = await clients.listClients(context.workspaceId);
  const allContracts = await contracts.listContracts(context.workspaceId);
  
  // Filter to only active clients for new time entries
  const activeClients = allClients.filter(client => client.status === "ACTIVE");
  
  return {
    clients: activeClients,
    contracts: allContracts,
  };
}