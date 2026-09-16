// src/application/workspace/resolve-workspace-context.ts
import { toWorkspaceContext, type WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceMemberRepository, WorkspaceRepository } from "@/domain/repositories";

export type WorkspaceResolutionResult =
  | { status: "resolved"; context: WorkspaceContext }
  | { status: "onboarding_required" }
  | { status: "ambiguous_membership" };

/**
 * Resolves the current workspace from the authenticated session user id.
 * `userId` must come from the trusted server session, never from the browser.
 * Zero memberships require onboarding. Multiple memberships fail closed.
 * BR-105-014: fetches the workspace record to include the IANA timezone in the context.
 */
export async function resolveWorkspaceContext(
  userId: string,
  members: WorkspaceMemberRepository,
  workspaces: WorkspaceRepository,
): Promise<WorkspaceResolutionResult> {
  const memberships = await members.listMembershipsByUserId(userId);
  const [membership] = memberships;

  if (!membership) {
    return { status: "onboarding_required" };
  }

  if (memberships.length > 1) {
    return { status: "ambiguous_membership" };
  }

  const workspace = await workspaces.getWorkspaceById(membership.workspaceId);

  return {
    status: "resolved",
    context: toWorkspaceContext(membership, workspace?.timezone ?? "UTC"),
  };
}
