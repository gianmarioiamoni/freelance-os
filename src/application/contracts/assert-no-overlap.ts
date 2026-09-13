// src/application/contracts/assert-no-overlap.ts
import { hasOverlappingContract } from "@/application/contracts/contract-validity";
import { OverlappingContractError } from "@/domain/contract-errors";
import type { ContractRepository } from "@/domain/repositories";

export async function assertNoOverlappingContract(
  workspaceId: string,
  clientId: string,
  validFrom: Date,
  validTo: Date | null,
  contracts: ContractRepository,
  excludeContractId?: string,
): Promise<void> {
  const existing = await contracts.listContractsForClient(workspaceId, clientId);

  if (hasOverlappingContract(existing, validFrom, validTo, excludeContractId)) {
    throw new OverlappingContractError();
  }
}
