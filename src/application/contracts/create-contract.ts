// src/application/contracts/create-contract.ts
import { assertNoOverlappingContract } from "@/application/contracts/assert-no-overlap";
import {
  parseContractCreateInput,
  type ContractCreateInput,
} from "@/application/contracts/contract-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import {
  ClientArchivedError,
  OverlappingContractError,
} from "@/domain/contract-errors";
import { ConstraintViolationError } from "@/domain/persistence-errors";
import type { ContractRecord } from "@/domain/persistence-types";
import type { ClientRepository, ContractRepository } from "@/domain/repositories";

export async function createContract(
  context: WorkspaceContext,
  input: ContractCreateInput,
  clients: ClientRepository,
  contracts: ContractRepository,
): Promise<ContractRecord> {
  const validated = parseContractCreateInput(input);
  const client = await clients.getClient(context.workspaceId, validated.clientId);

  if (!client) {
    throw new ClientNotFoundError();
  }

  if (client.status === "ARCHIVED") {
    throw new ClientArchivedError();
  }

  await assertNoOverlappingContract(
    context.workspaceId,
    validated.clientId,
    validated.validFrom,
    validated.validTo,
    contracts,
  );

  try {
    return await contracts.createContract(context.workspaceId, validated);
  } catch (error) {
    if (error instanceof ConstraintViolationError) {
      throw new OverlappingContractError();
    }

    throw error;
  }
}
