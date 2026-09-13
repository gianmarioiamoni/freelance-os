// src/features/contracts/load-contracts.ts
import { getClient } from "@/application/clients/get-client";
import { listClients } from "@/application/clients/list-clients";
import { getContract } from "@/application/contracts/get-contract";
import { listContracts } from "@/application/contracts/list-contracts";
import { listContractsForClient } from "@/application/contracts/list-contracts-for-client";
import { getAuthorizedWorkspace } from "@/application/workspace/get-authorized-workspace";
import { ClientNotFoundError } from "@/domain/client-errors";
import { ContractNotFoundError } from "@/domain/contract-errors";
import type {
  ClientRecord,
  ContractRecord,
  WorkspaceRecord,
} from "@/domain/persistence-types";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { notFound } from "next/navigation";

async function loadWorkspaceResources(): Promise<{
  context: Awaited<ReturnType<typeof getCurrentWorkspaceContext>>;
  repositories: ReturnType<typeof createRepositories>;
  workspace: WorkspaceRecord;
}> {
  const context = await getCurrentWorkspaceContext();
  const repositories = createRepositories();
  const authorized = await getAuthorizedWorkspace(
    context.userId,
    context.workspaceId,
    {
      members: repositories.members,
      workspaces: repositories.workspaces,
    },
  );

  return {
    context,
    repositories,
    workspace: authorized.workspace,
  };
}

export async function loadContractWorkspace(): Promise<WorkspaceRecord> {
  const { workspace } = await loadWorkspaceResources();
  return workspace;
}

export async function loadWorkspaceContractsForClient(
  clientId: string,
): Promise<ContractRecord[]> {
  const { context, repositories } = await loadWorkspaceResources();

  try {
    return await listContractsForClient(
      context,
      clientId,
      repositories.clients,
      repositories.contracts,
    );
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export async function loadContractListPageData(): Promise<{
  contracts: ContractRecord[];
  clients: ClientRecord[];
  activeClients: ClientRecord[];
  workspace: WorkspaceRecord;
}> {
  const { context, repositories, workspace } = await loadWorkspaceResources();
  const [contracts, clients] = await Promise.all([
    listContracts(context, repositories.contracts),
    listClients(context, repositories.clients),
  ]);

  return {
    contracts,
    clients,
    activeClients: clients.filter((client) => client.status === "ACTIVE"),
    workspace,
  };
}

export async function loadContractCreatePageData(preselectedClientId?: string): Promise<{
  activeClients: ClientRecord[];
  selectedClient: ClientRecord | null;
  workspace: WorkspaceRecord;
}> {
  const { context, repositories, workspace } = await loadWorkspaceResources();
  const clients = await listClients(context, repositories.clients, "ACTIVE");
  const selectedClient =
    preselectedClientId === undefined
      ? null
      : (clients.find((client) => client.id === preselectedClientId) ?? null);

  return {
    activeClients: clients,
    selectedClient,
    workspace,
  };
}

export async function loadContractDetailPageData(contractId: string): Promise<{
  contract: ContractRecord;
  client: ClientRecord | null;
  workspace: WorkspaceRecord;
}> {
  const { context, repositories, workspace } = await loadWorkspaceResources();
  let contract: ContractRecord;

  try {
    contract = await getContract(context, contractId, repositories.contracts);
  } catch (error) {
    if (error instanceof ContractNotFoundError) {
      notFound();
    }

    throw error;
  }

  let client: ClientRecord | null = null;

  try {
    client = await getClient(context, contract.clientId, repositories.clients);
  } catch (error) {
    if (!(error instanceof ClientNotFoundError)) {
      throw error;
    }
  }

  return { contract, client, workspace };
}
