// src/application/clients/update-client.ts
import {
  parseClientWriteInput,
  type ClientWriteInput,
} from "@/application/clients/client-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type { ClientRecord } from "@/domain/persistence-types";
import type { ClientRepository } from "@/domain/repositories";

export async function updateClient(
  context: WorkspaceContext,
  clientId: string,
  input: ClientWriteInput,
  clients: ClientRepository,
): Promise<ClientRecord> {
  const validated = parseClientWriteInput(input);

  try {
    return await clients.updateClient(context.workspaceId, clientId, validated);
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      throw new ClientNotFoundError();
    }

    throw error;
  }
}
