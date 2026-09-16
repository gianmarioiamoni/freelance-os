// src/application/workspace/get-authorized-workspace.ts
import { requireWorkspaceAccess } from "@/application/workspace/require-workspace-access";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceRecord } from "@/domain/persistence-types";
import type {
  WorkspaceMemberRepository,
  WorkspaceRepository,
} from "@/domain/repositories";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

export type GetAuthorizedWorkspaceDependencies = {
  members: WorkspaceMemberRepository;
  workspaces: WorkspaceRepository;
};

export type AuthorizedWorkspace = {
  context: WorkspaceContext;
  workspace: WorkspaceRecord;
};

/**
 * Authorizes membership, then reads only that workspace.
 * `getWorkspaceById` is a persistence exception and is not proof of access.
 * This helper exists so workspace isolation can be proven without exposing
 * an unauthorized identifier lookup as an application operation.
 */
export async function getAuthorizedWorkspace(
  userId: string,
  requestedWorkspaceId: string,
  dependencies: GetAuthorizedWorkspaceDependencies,
): Promise<AuthorizedWorkspace> {
  const context = await requireWorkspaceAccess(
    userId,
    requestedWorkspaceId,
    dependencies.members,
    dependencies.workspaces,
  );
  const workspace = await dependencies.workspaces.getWorkspaceById(
    context.workspaceId,
  );

  if (!workspace) {
    throw new UnauthorizedWorkspaceAccessError();
  }

  return { context, workspace };
}
