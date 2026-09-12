// src/application/workspace/resolve-workspace-context.ts
import { toWorkspaceContext, type WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceMemberRepository } from "@/domain/repositories";

export type WorkspaceResolutionResult =
  | { status: "resolved"; context: WorkspaceContext }
  | { status: "onboarding_required" }
  | { status: "ambiguous_membership" };

/**
 * Resolves the current workspace from the authenticated session user id.
 * `userId` must come from the trusted server session, never from the browser.
 * Zero memberships require onboarding. Multiple memberships fail closed.
 */
export async function resolveWorkspaceContext(
  userId: string,
  members: WorkspaceMemberRepository,
): Promise<WorkspaceResolutionResult> {
  const memberships = await members.listMembershipsByUserId(userId);
  const [membership] = memberships;

  if (!membership) {
    return { status: "onboarding_required" };
  }

  if (memberships.length > 1) {
    return { status: "ambiguous_membership" };
  }

  return {
    status: "resolved",
    context: toWorkspaceContext(membership),
  };
}
