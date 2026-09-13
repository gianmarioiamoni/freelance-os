// src/application/contracts/get-contract.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotFoundError } from "@/domain/contract-errors";
import type { ContractRecord } from "@/domain/persistence-types";
import type { ContractRepository } from "@/domain/repositories";

export async function getContract(
  context: WorkspaceContext,
  contractId: string,
  contracts: ContractRepository,
): Promise<ContractRecord> {
  const contract = await contracts.getContract(context.workspaceId, contractId);

  if (!contract) {
    throw new ContractNotFoundError();
  }

  return contract;
}
