// src/application/workspace/workspace-context.ts
import type { WorkspaceMemberRecord, WorkspaceMemberRole } from "@/domain/persistence-types";

export type WorkspaceContext = {
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
};

export function toWorkspaceContext(
  membership: WorkspaceMemberRecord,
): WorkspaceContext {
  return {
    workspaceId: membership.workspaceId,
    userId: membership.userId,
    role: membership.role,
  };
}
