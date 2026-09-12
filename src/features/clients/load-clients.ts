// src/features/clients/load-clients.ts
import { getClient } from "@/application/clients/get-client";
import { listClients } from "@/application/clients/list-clients";
import { ClientNotFoundError } from "@/domain/client-errors";
import type { ClientRecord, ClientStatus } from "@/domain/persistence-types";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { notFound } from "next/navigation";

export async function loadWorkspaceClients(
  status: ClientStatus,
): Promise<ClientRecord[]> {
  const context = await getCurrentWorkspaceContext();

  return listClients(context, createRepositories().clients, status);
}

export async function loadWorkspaceClient(
  clientId: string,
): Promise<ClientRecord> {
  const context = await getCurrentWorkspaceContext();

  try {
    return await getClient(context, clientId, createRepositories().clients);
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      notFound();
    }

    throw error;
  }
}
