// src/features/settings/load-settings.ts
import { DEFAULT_CONTRACT_WARNING_PERCENT } from "@/application/workspace/create-first-workspace";
import { getAuthorizedWorkspaceSettings } from "@/application/workspace/get-authorized-workspace-settings";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceMemberRole } from "@/domain/persistence-types";
import type { AuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";

export type WorkspaceSettingsPageData = {
  accountName: string;
  accountEmail: string;
  workspaceName: string;
  timezone: string;
  currency: string;
  role: WorkspaceMemberRole;
  contractWarningPercent: number;
};

export async function loadWorkspaceSettingsPage(
  context: WorkspaceContext,
  session: AuthSession,
): Promise<WorkspaceSettingsPageData> {
  const repositories = createRepositories();
  const authorized = await getAuthorizedWorkspaceSettings(
    context.userId,
    context.workspaceId,
    {
      members: repositories.members,
      workspaces: repositories.workspaces,
      settings: repositories.settings,
    },
  );

  return {
    accountName: session.user.name?.trim() || session.user.email,
    accountEmail: session.user.email,
    workspaceName: authorized.workspace.name,
    timezone: authorized.workspace.timezone,
    currency: authorized.workspace.currency,
    role: authorized.context.role,
    contractWarningPercent:
      authorized.settings?.contractWarningPercent ??
      DEFAULT_CONTRACT_WARNING_PERCENT,
  };
}
