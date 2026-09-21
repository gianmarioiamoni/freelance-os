// src/domain/repositories.ts
import type {
  AddWorkspaceMemberInput,
  AlertRecord,
  AlertType,
  ClientRecord,
  ClientStatus,
  ContractRecord,
  CreateAlertInput,
  CreateClientInput,
  CreateContractInput,
  CreateNotificationInput,
  CreateWorkspaceInput,
  NotificationRecord,
  PutWorkspaceSettingsInput,
  RecordTimeEntryInput,
  TimeEntryRecord,
  UpdateClientInput,
  UpdateContractInput,
  UpdateTimeEntryInput,
  UpdateWorkspaceInput,
  WorkspaceMemberRecord,
  WorkspaceRecord,
  WorkspaceSettingsRecord,
} from "@/domain/persistence-types";
import type {
  AnalyticsPeriod,
  MonthlyHoursAnalytics,
  DailyAnalytics,
  ClientAllocation,
  ContractUtilization,
  ExpectedContractFact,
} from "@/domain/analytics-types";

export type WorkspaceRepository = {
  createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceRecord>;
  getWorkspaceById(workspaceId: string): Promise<WorkspaceRecord | null>;
  updateWorkspace(
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ): Promise<WorkspaceRecord>;
};

export type WorkspaceMemberRepository = {
  addMember(input: AddWorkspaceMemberInput): Promise<WorkspaceMemberRecord>;
  getMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberRecord | null>;
  listMembers(workspaceId: string): Promise<WorkspaceMemberRecord[]>;
  listMembershipsByUserId(userId: string): Promise<WorkspaceMemberRecord[]>;
};

export type WorkspaceSettingsRepository = {
  getSettings(workspaceId: string): Promise<WorkspaceSettingsRecord | null>;
  putSettings(
    workspaceId: string,
    input: PutWorkspaceSettingsInput,
  ): Promise<WorkspaceSettingsRecord>;
};

export type ClientRepository = {
  createClient(
    workspaceId: string,
    input: CreateClientInput,
  ): Promise<ClientRecord>;
  getClient(
    workspaceId: string,
    clientId: string,
  ): Promise<ClientRecord | null>;
  listClients(
    workspaceId: string,
    status?: ClientStatus,
  ): Promise<ClientRecord[]>;
  updateClient(
    workspaceId: string,
    clientId: string,
    input: UpdateClientInput,
  ): Promise<ClientRecord>;
  archiveClient(workspaceId: string, clientId: string): Promise<ClientRecord>;
};

export type ContractRepository = {
  createContract(
    workspaceId: string,
    input: CreateContractInput,
  ): Promise<ContractRecord>;
  getContract(
    workspaceId: string,
    contractId: string,
  ): Promise<ContractRecord | null>;
  listContracts(workspaceId: string): Promise<ContractRecord[]>;
  listContractsForClient(
    workspaceId: string,
    clientId: string,
  ): Promise<ContractRecord[]>;
  updateContract(
    workspaceId: string,
    contractId: string,
    input: UpdateContractInput,
  ): Promise<ContractRecord>;
  findContractCoveringDate(
    workspaceId: string,
    clientId: string,
    date: Date,
  ): Promise<ContractRecord | null>;
};

export type TimeEntryRepository = {
  recordTimeEntry(
    workspaceId: string,
    input: RecordTimeEntryInput,
  ): Promise<TimeEntryRecord>;
  getTimeEntry(
    workspaceId: string,
    timeEntryId: string,
  ): Promise<TimeEntryRecord | null>;
  listTimeEntriesForDate(
    workspaceId: string,
    workDate: Date,
  ): Promise<TimeEntryRecord[]>;
  listTimeEntriesForPeriod(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TimeEntryRecord[]>;
  updateTimeEntry(
    workspaceId: string,
    timeEntryId: string,
    input: UpdateTimeEntryInput,
  ): Promise<TimeEntryRecord>;
  deleteTimeEntry(
    workspaceId: string,
    timeEntryId: string,
  ): Promise<void>;
};

export type AlertRepository = {
  createAlert(
    workspaceId: string,
    input: CreateAlertInput,
  ): Promise<AlertRecord>;
  getAlert(workspaceId: string, alertId: string): Promise<AlertRecord | null>;
  findAlertByDeduplicationKey(
    workspaceId: string,
    deduplicationKey: string,
  ): Promise<AlertRecord | null>;
  /**
   * Returns the currently-active (resolvedAt IS NULL) alert for the given
   * semantic identity: (workspaceId, contractId, type, periodStart).
   *
   * Used by resolution logic so it is independent of the specific deduplication
   * key (which may be timestamp-suffixed after a re-trigger).
   */
  findActiveAlertByContractAndType(
    workspaceId: string,
    contractId: string,
    type: AlertType,
    periodStart: Date,
  ): Promise<AlertRecord | null>;
  resolveAlert(
    workspaceId: string,
    alertId: string,
    resolvedAt: Date,
  ): Promise<AlertRecord>;
};

export type NotificationRepository = {
  createNotification(
    workspaceId: string,
    input: CreateNotificationInput,
  ): Promise<NotificationRecord>;
  getNotification(
    workspaceId: string,
    notificationId: string,
  ): Promise<NotificationRecord | null>;
  listNotificationsForUser(
    workspaceId: string,
    userId: string,
  ): Promise<NotificationRecord[]>;
  markNotificationRead(
    workspaceId: string,
    notificationId: string,
    readAt: Date,
  ): Promise<NotificationRecord>;
  countUnreadNotificationsForUser(
    workspaceId: string,
    userId: string,
  ): Promise<number>;
};

export type AnalyticsRepository = {
  getMonthlyAnalytics(
    workspaceId: string,
    period: AnalyticsPeriod,
  ): Promise<MonthlyHoursAnalytics>;
  getDailyAnalytics(
    workspaceId: string,
    period: AnalyticsPeriod,
  ): Promise<DailyAnalytics[]>;
  getClientAllocations(
    workspaceId: string,
    period: AnalyticsPeriod,
  ): Promise<ClientAllocation[]>;
  getContractUtilizations(
    workspaceId: string,
    period: AnalyticsPeriod,
  ): Promise<ContractUtilization[]>;
  listTimeEntriesForPeriod(
    workspaceId: string,
    period: AnalyticsPeriod,
  ): Promise<TimeEntryRecord[]>;
  listExpectedContracts(
    workspaceId: string,
    period: AnalyticsPeriod,
  ): Promise<ExpectedContractFact[]>;
};

export type PersistenceRepositories = {
  workspaces: WorkspaceRepository;
  members: WorkspaceMemberRepository;
  settings: WorkspaceSettingsRepository;
  clients: ClientRepository;
  contracts: ContractRepository;
  timeEntries: TimeEntryRepository;
  alerts: AlertRepository;
  notifications: NotificationRepository;
  analytics: AnalyticsRepository;
};
