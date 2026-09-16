// src/application/workspace/require-workspace-access.ts
import { toWorkspaceContext, type WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceMemberRepository, WorkspaceRepository } from "@/domain/repositories";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

/**
 * Authorizes a requested workspace for the authenticated session user.
 * `userId` must come from the trusted server session.
 * `workspaceId` is a requested target, not proof of access.
 * BR-105-014: fetches workspace record to include timezone in the context.
 */
export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string,
  members: WorkspaceMemberRepository,
  workspaces?: WorkspaceRepository,
): Promise<WorkspaceContext> {
  const membership = await members.getMember(workspaceId, userId);

  if (!membership) {
    throw new UnauthorizedWorkspaceAccessError();
  }

  const workspace = workspaces
    ? await workspaces.getWorkspaceById(workspaceId)
    : null;

  return toWorkspaceContext(membership, workspace?.timezone ?? "UTC");
}
