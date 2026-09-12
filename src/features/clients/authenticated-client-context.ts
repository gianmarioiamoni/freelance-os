// src/features/clients/authenticated-client-context.ts
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { ClientRepository } from "@/domain/repositories";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { redirect } from "next/navigation";

export type AuthenticatedClientContext = {
  context: WorkspaceContext;
  clients: ClientRepository;
};

export async function getAuthenticatedClientContext(): Promise<AuthenticatedClientContext> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const context = await getCurrentWorkspaceContext();

  return {
    context,
    clients: createRepositories().clients,
  };
}
