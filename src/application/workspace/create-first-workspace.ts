// src/application/workspace/create-first-workspace.ts
import {
  parseWorkspaceCreationInput,
  type WorkspaceCreationInput,
} from "@/application/workspace/workspace-creation-input";
import {
  toWorkspaceContext,
  type WorkspaceContext,
} from "@/application/workspace/workspace-context";
import type {
  WorkspaceMemberRecord,
  WorkspaceRecord,
  WorkspaceSettingsRecord,
} from "@/domain/persistence-types";
import type { PersistenceRepositories } from "@/domain/repositories";
import { FirstWorkspaceAlreadyExistsError } from "@/domain/workspace-errors";

export const DEFAULT_CONTRACT_WARNING_PERCENT = 80;
export const DEFAULT_MONTHLY_CAPACITY_WARNING_PERCENT = 80;

export type CreateFirstWorkspaceDependencies = {
  runInTransaction: <T>(
    work: (repositories: PersistenceRepositories) => Promise<T>,
  ) => Promise<T>;
};

export type CreatedFirstWorkspace = {
  workspace: WorkspaceRecord;
  membership: WorkspaceMemberRecord;
  settings: WorkspaceSettingsRecord;
  context: WorkspaceContext;
};

/**
 * Creates the authenticated user's first workspace.
 * `userId` must come from the trusted server session, never from the browser.
 * Rejects if the user already has a membership. Does not create additional workspaces.
 *
 * Workspace, OWNER membership, and settings are written in one transaction.
 * Eligibility is re-checked inside that transaction. WorkspaceMember is keyed by
 * `(workspaceId, userId)`, so the database cannot uniquely enforce one membership
 * per user; a concurrent first-workspace race remains a documented limitation.
 */
export async function createFirstWorkspace(
  userId: string,
  input: WorkspaceCreationInput,
  dependencies: CreateFirstWorkspaceDependencies,
): Promise<CreatedFirstWorkspace> {
  const validated = parseWorkspaceCreationInput(input);

  return dependencies.runInTransaction(async (repositories) => {
    const existingMemberships =
      await repositories.members.listMembershipsByUserId(userId);

    if (existingMemberships.length > 0) {
      throw new FirstWorkspaceAlreadyExistsError();
    }

    const workspace = await repositories.workspaces.createWorkspace({
      name: validated.name,
      timezone: validated.timezone,
      currency: validated.currency,
    });

    const membership = await repositories.members.addMember({
      workspaceId: workspace.id,
      userId,
      role: "OWNER",
    });

    const settings = await repositories.settings.putSettings(workspace.id, {
      timezone: validated.timezone,
      currency: validated.currency,
      contractWarningPercent: DEFAULT_CONTRACT_WARNING_PERCENT,
      monthlyCapacityWarningPercent: DEFAULT_MONTHLY_CAPACITY_WARNING_PERCENT,
    });

    return {
      workspace,
      membership,
      settings,
      context: toWorkspaceContext(membership, workspace.timezone),
    };
  });
}
