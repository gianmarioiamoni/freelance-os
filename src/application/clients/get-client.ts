// src/application/clients/get-client.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import type { ClientRecord } from "@/domain/persistence-types";
import type { ClientRepository } from "@/domain/repositories";

export async function getClient(
  context: WorkspaceContext,
  clientId: string,
  clients: ClientRepository,
): Promise<ClientRecord> {
  const client = await clients.getClient(context.workspaceId, clientId);

  if (!client) {
    throw new ClientNotFoundError();
  }

  return client;
}
