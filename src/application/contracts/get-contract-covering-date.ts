// src/application/contracts/get-contract-covering-date.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import type { ContractRecord } from "@/domain/persistence-types";
import type { ClientRepository, ContractRepository } from "@/domain/repositories";

export async function getContractCoveringDate(
  context: WorkspaceContext,
  clientId: string,
  date: Date,
  clients: ClientRepository,
  contracts: ContractRepository,
): Promise<ContractRecord | null> {
  const client = await clients.getClient(context.workspaceId, clientId);

  if (!client) {
    throw new ClientNotFoundError();
  }

  return contracts.findContractCoveringDate(
    context.workspaceId,
    clientId,
    date,
  );
}
