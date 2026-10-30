// src/application/timesheet-viewer/get-authorized-time-entries.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { TimeEntryRecord } from "@/domain/persistence-types";
import type {
  TimeEntryRepository,
  ViewerAccessRepository,
} from "@/domain/repositories";
import { ViewerAccessNotFoundError, ViewerUnauthorizedError } from "@/domain/viewer-errors";

export type TimeEntryFilter = {
  startDate: Date;
  endDate: Date;
  contractIds?: string[];
};

/**
 * Returns time entries for a viewer, filtered by their authorized contracts.
 * Enforces viewer authorization at application layer.
 */
export async function getAuthorizedTimeEntries(
  context: WorkspaceContext,
  viewerAccessId: string,
  filter: TimeEntryFilter,
  viewerAccess: ViewerAccessRepository,
  timeEntries: TimeEntryRepository,
): Promise<TimeEntryRecord[]> {
  // Verify viewer exists and is ACTIVE
  const viewer = await viewerAccess.getById(context.workspaceId, viewerAccessId);
  if (!viewer || viewer.status !== "ACTIVE") {
    throw new ViewerAccessNotFoundError();
  }

  // Get authorized contracts
  const authorizedContracts = await viewerAccess.listAuthorizedContracts(
    context.workspaceId,
    viewerAccessId,
  );

  if (authorizedContracts.length === 0) {
    throw new ViewerUnauthorizedError();
  }

  const authorizedContractIds = new Set(
    authorizedContracts.map((ac) => ac.contractId),
  );

  // Fetch time entries for period
  const allEntries = await timeEntries.listTimeEntriesForPeriod(
    context.workspaceId,
    filter.startDate,
    filter.endDate,
  );

  // Filter by authorized contracts
  let filtered = allEntries.filter((entry) =>
    authorizedContractIds.has(entry.contractId),
  );

  // Apply optional contractId filter
  if (filter.contractIds && filter.contractIds.length > 0) {
    const requestedIds = new Set(filter.contractIds);
    // Verify requested IDs are authorized
    for (const id of requestedIds) {
      if (!authorizedContractIds.has(id)) {
        throw new ViewerUnauthorizedError();
      }
    }
    filtered = filtered.filter((entry) => requestedIds.has(entry.contractId));
  }

  return filtered;
}
