// src/application/workspace/get-authorized-workspace-settings.ts
import { getAuthorizedWorkspace } from "@/application/workspace/get-authorized-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type {
  WorkspaceRecord,
  WorkspaceSettingsRecord,
} from "@/domain/persistence-types";
import type {
  WorkspaceMemberRepository,
  WorkspaceRepository,
  WorkspaceSettingsRepository,
} from "@/domain/repositories";

export type GetAuthorizedWorkspaceSettingsDependencies = {
  members: WorkspaceMemberRepository;
  workspaces: WorkspaceRepository;
  settings: WorkspaceSettingsRepository;
};

export type AuthorizedWorkspaceSettings = {
  context: WorkspaceContext;
  workspace: WorkspaceRecord;
  settings: WorkspaceSettingsRecord | null;
};

/**
 * Authorizes membership, then reads that workspace and its settings.
 * Settings administration is out of scope; this is a trusted read only.
 */
export async function getAuthorizedWorkspaceSettings(
  userId: string,
  requestedWorkspaceId: string,
  dependencies: GetAuthorizedWorkspaceSettingsDependencies,
): Promise<AuthorizedWorkspaceSettings> {
  const authorized = await getAuthorizedWorkspace(
    userId,
    requestedWorkspaceId,
    {
      members: dependencies.members,
      workspaces: dependencies.workspaces,
    },
  );

  const settings = await dependencies.settings.getSettings(
    authorized.workspace.id,
  );

  return {
    context: authorized.context,
    workspace: authorized.workspace,
    settings,
  };
}
