// src/application/clients/create-client.ts
import {
  parseClientWriteInput,
  type ClientWriteInput,
} from "@/application/clients/client-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { ClientRecord } from "@/domain/persistence-types";
import type { ClientRepository } from "@/domain/repositories";

export async function createClient(
  context: WorkspaceContext,
  input: ClientWriteInput,
  clients: ClientRepository,
): Promise<ClientRecord> {
  const validated = parseClientWriteInput(input);
  return clients.createClient(context.workspaceId, validated);
}
