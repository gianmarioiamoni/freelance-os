// src/application/timesheet-viewer/authorize-contract.ts
import {
  parseAuthorizeContractInput,
  type AuthorizeContractInput,
} from "@/application/timesheet-viewer/viewer-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { TimesheetViewerContractRecord } from "@/domain/persistence-types";
import type {
  ContractRepository,
  ViewerAccessRepository,
} from "@/domain/repositories";
import { ContractNotFoundError } from "@/domain/contract-errors";
import { ViewerAccessNotFoundError } from "@/domain/viewer-errors";

export async function authorizeContract(
  context: WorkspaceContext,
  input: AuthorizeContractInput,
  viewerAccess: ViewerAccessRepository,
  contracts: ContractRepository,
): Promise<TimesheetViewerContractRecord> {
  const validated = parseAuthorizeContractInput(input);

  // Verify viewer access exists and belongs to workspace
  const viewer = await viewerAccess.getById(
    context.workspaceId,
    validated.viewerAccessId,
  );
  if (!viewer) {
    throw new ViewerAccessNotFoundError();
  }

  // Can authorize for PENDING or ACTIVE status (not REVOKED)
  if (viewer.status === "REVOKED") {
    throw new ViewerAccessNotFoundError();
  }

  // Verify contract exists and belongs to workspace
  const contract = await contracts.getContract(
    context.workspaceId,
    validated.contractId,
  );
  if (!contract) {
    throw new ContractNotFoundError();
  }

  return viewerAccess.authorizeContract(context.workspaceId, {
    viewerAccessId: validated.viewerAccessId,
    contractId: validated.contractId,
    displayLabel: validated.displayLabel,
  });
}
