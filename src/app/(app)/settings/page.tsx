// src/app/(app)/settings/page.tsx
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import { ErrorState } from "@/components/states/ErrorState";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import { loadWorkspaceSettingsPage } from "@/features/settings/load-settings";
import { WorkspaceSettingsView } from "@/features/settings/WorkspaceSettingsView";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { redirect } from "next/navigation";
import type { JSX } from "react";

export default async function SettingsPage(): Promise<JSX.Element> {
  const context = await getCurrentWorkspaceContext();
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  try {
    const data = await loadWorkspaceSettingsPage(context, session);
    return <WorkspaceSettingsView data={data} />;
  } catch (error) {
    if (error instanceof UnauthorizedWorkspaceAccessError) {
      return <ErrorState message="This workspace is not available." />;
    }

    return (
      <ErrorState message="Unable to load settings. Please try refreshing the page." />
    );
  }
}
