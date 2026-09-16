// src/application/workspace/workspace-context.ts
import type { WorkspaceMemberRecord, WorkspaceMemberRole } from "@/domain/persistence-types";

export type WorkspaceContext = {
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  /**
   * IANA timezone string for the workspace (e.g. "Europe/Rome").
   * BR-105-014: this is the sole authority for all period boundary resolution.
   * Defaults to "UTC" when not yet populated (pre-P105-03 callers).
   */
  timezone: string;
};

export function toWorkspaceContext(
  membership: WorkspaceMemberRecord,
  timezone = "UTC",
): WorkspaceContext {
  return {
    workspaceId: membership.workspaceId,
    userId: membership.userId,
    role: membership.role,
    timezone,
  };
}
