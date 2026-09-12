// src/application/clients/archive-client.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type { ClientRecord } from "@/domain/persistence-types";
import type { ClientRepository } from "@/domain/repositories";

export async function archiveClient(
  context: WorkspaceContext,
  clientId: string,
  clients: ClientRepository,
): Promise<ClientRecord> {
  try {
    return await clients.archiveClient(context.workspaceId, clientId);
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      throw new ClientNotFoundError();
    }

    throw error;
  }
}
