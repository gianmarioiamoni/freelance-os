// src/features/time-entries/authenticated-time-entry-context.ts
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type {
  AlertRepository,
  AnalyticsRepository,
  ClientRepository,
  ContractRepository,
  NotificationRepository,
  TimeEntryRepository,
  WorkspaceMemberRepository,
  WorkspaceSettingsRepository,
} from "@/domain/repositories";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { redirect } from "next/navigation";

export type AuthenticatedTimeEntryContext = {
  context: WorkspaceContext;
  clients: ClientRepository;
  contracts: ContractRepository;
  timeEntries: TimeEntryRepository;
  alerts: AlertRepository;
  notifications: NotificationRepository;
  members: WorkspaceMemberRepository;
  settings: WorkspaceSettingsRepository;
  analytics: AnalyticsRepository;
};

export async function getAuthenticatedTimeEntryContext(): Promise<AuthenticatedTimeEntryContext> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const context = await getCurrentWorkspaceContext();
  const repositories = createRepositories();

  return {
    context,
    clients: repositories.clients,
    contracts: repositories.contracts,
    timeEntries: repositories.timeEntries,
    alerts: repositories.alerts,
    notifications: repositories.notifications,
    members: repositories.members,
    settings: repositories.settings,
    analytics: repositories.analytics,
  };
}