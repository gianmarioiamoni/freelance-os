// src/application/ai/require-ai-membership.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceMemberRepository } from "@/domain/repositories";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

/**
 * Re-checks workspace membership at the AI entry.
 * Uses the trusted context only. Never accepts a caller-supplied workspaceId.
 */
export async function requireAiMembership(
  context: WorkspaceContext,
  members: WorkspaceMemberRepository,
): Promise<void> {
  const membership = await members.getMember(context.workspaceId, context.userId);
  if (!membership) {
    throw new UnauthorizedWorkspaceAccessError();
  }
}
