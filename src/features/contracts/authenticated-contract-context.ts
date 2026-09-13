// src/features/contracts/authenticated-contract-context.ts
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { ClientRepository, ContractRepository } from "@/domain/repositories";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { redirect } from "next/navigation";

export type AuthenticatedContractContext = {
  context: WorkspaceContext;
  clients: ClientRepository;
  contracts: ContractRepository;
};

export async function getAuthenticatedContractContext(): Promise<AuthenticatedContractContext> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const context = await getCurrentWorkspaceContext();
  const repositories = createRepositories();

  return {
    context,
    clients: repositories.clients,
    contracts: repositories.contracts,
  };
}
