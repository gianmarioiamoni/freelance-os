// src/application/time-entries/contract-validation.ts
import type { ContractRecord } from "@/domain/persistence-types";
import type { ContractRepository } from "@/domain/repositories";
import { ContractNotFoundError } from "@/domain/contract-errors";
import { ClientArchivedError } from "@/domain/contract-errors";
import { ContractNotValidForDateError } from "@/domain/time-entry-errors";
import type { ClientRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

export function isContractValidForDate(contract: ContractRecord, workDate: Date): boolean {
  const workDateTime = workDate.getTime();
  const validFromTime = contract.validFrom.getTime();

  if (workDateTime < validFromTime) {
    return false;
  }

  if (contract.validTo === null) {
    return true; // Open-ended contract
  }

  return workDateTime < contract.validTo.getTime(); // validTo is exclusive
}

export async function validateContractForTimeEntry(
  context: WorkspaceContext,
  clientId: string,
  contractId: string,
  workDate: Date,
  clients: ClientRepository,
  contracts: ContractRepository,
): Promise<ContractRecord> {
  // Verify client exists and belongs to workspace
  const client = await clients.getClient(context.workspaceId, clientId);
  if (!client) {
    throw new ClientArchivedError(); // Treat missing client as archived for security
  }

  // For new time entries, reject archived clients
  if (client.status === "ARCHIVED") {
    throw new ClientArchivedError();
  }

  // Verify contract exists and belongs to workspace
  const contract = await contracts.getContract(context.workspaceId, contractId);
  if (!contract) {
    throw new ContractNotFoundError();
  }

  // Verify contract belongs to the specified client
  if (contract.clientId !== clientId) {
    throw new ContractNotFoundError();
  }

  // Verify contract is valid for the work date
  if (!isContractValidForDate(contract, workDate)) {
    throw new ContractNotValidForDateError();
  }

  return contract;
}

export async function getEligibleContracts(
  context: WorkspaceContext,
  clientId: string,
  workDate: Date,
  contracts: ContractRepository,
): Promise<ContractRecord[]> {
  const clientContracts = await contracts.listContractsForClient(context.workspaceId, clientId);
  return clientContracts.filter(contract => isContractValidForDate(contract, workDate));
}