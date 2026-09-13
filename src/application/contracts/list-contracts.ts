// src/application/contracts/list-contracts.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { ContractRecord } from "@/domain/persistence-types";
import type { ContractRepository } from "@/domain/repositories";

export async function listContracts(
  context: WorkspaceContext,
  contracts: ContractRepository,
): Promise<ContractRecord[]> {
  return contracts.listContracts(context.workspaceId);
}
