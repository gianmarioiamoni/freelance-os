// src/application/timesheet-viewer/get-viewer-time-entries.ts
import type {
  ContractRepository,
  TimeEntryRepository,
  ViewerAccessRepository,
} from "@/domain/repositories";
import {
  ViewerAccessNotFoundError,
  ViewerUnauthorizedError,
} from "@/domain/viewer-errors";

export type ViewerTimeEntryDisplay = {
  id: string;
  workDate: Date;
  engagement: string;
  durationMinutes: number;
  description: string | null;
};

type ViewerTimeEntriesRepositories = {
  viewerAccess: ViewerAccessRepository;
  timeEntries: TimeEntryRepository;
  contracts: ContractRepository;
};

export async function getViewerTimeEntries(
  workspaceId: string,
  viewerAccessId: string,
  month: number,
  year: number,
  repositories: ViewerTimeEntriesRepositories,
): Promise<ViewerTimeEntryDisplay[]> {
  // 1. Verify viewer is ACTIVE
  const viewer = await repositories.viewerAccess.getById(
    workspaceId,
    viewerAccessId,
  );
  if (!viewer || viewer.status !== "ACTIVE") {
    throw new ViewerAccessNotFoundError();
  }

  // 2. Get authorized contracts
  const authorizedContracts =
    await repositories.viewerAccess.listAuthorizedContracts(
      workspaceId,
      viewerAccessId,
    );

  if (authorizedContracts.length === 0) {
    throw new ViewerUnauthorizedError();
  }

  // 3. Calculate period
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // 4. Fetch time entries for period
  const allEntries = await repositories.timeEntries.listTimeEntriesForPeriod(
    workspaceId,
    startDate,
    endDate,
  );

  // 5. Filter by authorized contracts
  const authorizedContractIds = new Set(
    authorizedContracts.map((ac) => ac.contractId),
  );
  const filteredEntries = allEntries.filter((entry) =>
    authorizedContractIds.has(entry.contractId),
  );

  // 6. Load contract references for display
  const contractsMap = new Map<string, string>();
  for (const contract of authorizedContracts) {
    const contractData = await repositories.contracts.getContract(
      workspaceId,
      contract.contractId,
    );
    if (contractData) {
      contractsMap.set(
        contract.contractId,
        contract.displayLabel || contractData.reference || "N/A",
      );
    }
  }

  // 7. Transform to display format and sort ascending by workDate (oldest first)
  return filteredEntries
    .map((entry) => ({
      id: entry.id,
      workDate: entry.workDate,
      engagement: contractsMap.get(entry.contractId) || "Unknown",
      durationMinutes: entry.durationMinutes,
      description: entry.description,
    }))
    .sort((a, b) => a.workDate.getTime() - b.workDate.getTime());
}
