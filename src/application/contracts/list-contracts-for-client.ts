// src/application/contracts/list-contracts-for-client.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import type { ContractRecord } from "@/domain/persistence-types";
import type { ClientRepository, ContractRepository } from "@/domain/repositories";

export async function listContractsForClient(
  context: WorkspaceContext,
  clientId: string,
  clients: ClientRepository,
  contracts: ContractRepository,
): Promise<ContractRecord[]> {
  const client = await clients.getClient(context.workspaceId, clientId);

  if (!client) {
    throw new ClientNotFoundError();
  }

  return contracts.listContractsForClient(context.workspaceId, clientId);
}
