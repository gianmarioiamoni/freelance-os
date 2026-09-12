// src/application/clients/list-clients.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { ClientRecord, ClientStatus } from "@/domain/persistence-types";
import type { ClientRepository } from "@/domain/repositories";

export async function listClients(
  context: WorkspaceContext,
  clients: ClientRepository,
  status?: ClientStatus,
): Promise<ClientRecord[]> {
  return clients.listClients(context.workspaceId, status);
}
