// src/app/(app)/layout.tsx
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import { getAuthorizedWorkspace } from "@/application/workspace/get-authorized-workspace";
import { getAccountDisplayLabel } from "@/components/app-shell/account-label";
import { AppShell } from "@/components/app-shell/AppShell";
import { ErrorState } from "@/components/states/ErrorState";
import { loadUnreadNotificationCount } from "@/features/notifications/load-notifications";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { redirect } from "next/navigation";
import type { JSX, ReactNode } from "react";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({
  children,
}: AppLayoutProps): Promise<JSX.Element> {
  const context = await getCurrentWorkspaceContext();
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const repositories = createRepositories();
  let workspaceName: string;

  try {
    const authorized = await getAuthorizedWorkspace(
      context.userId,
      context.workspaceId,
      {
        members: repositories.members,
        workspaces: repositories.workspaces,
      },
    );
    workspaceName = authorized.workspace.name;
  } catch {
    return <ErrorState message="This workspace is not available." />;
  }

  const unreadAlertCount = await loadUnreadNotificationCount();

  return (
    <AppShell
      workspaceName={workspaceName}
      accountLabel={getAccountDisplayLabel(
        session.user.name,
        session.user.email,
      )}
      unreadAlertCount={unreadAlertCount}
    >
      {children}
    </AppShell>
  );
}
