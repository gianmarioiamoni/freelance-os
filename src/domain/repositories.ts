// src/domain/repositories.ts
import type {
  AddWorkspaceMemberInput,
  AlertRecord,
  AlertType,
  AnomalyReportRecord,
  AnomalyReportStatus,
  AuthorizeContractInput,
  ClientRecord,
  ClientStatus,
  ContractRecord,
  CreateAlertInput,
  CreateAnomalyReportInput,
  CreateClientInput,
  CreateContractInput,
  CreateInviteTokenInput,
  CreateInvoiceInput,
  CreateNotificationInput,
  CreatePaymentInput,
  CreateViewerAccessInput,
  CreateWorkspaceInput,
  InvoiceRecord,
  InvoiceTrackingFilter,
  NotificationRecord,
  PaymentRecord,
  PutWorkspaceSettingsInput,
  RecordTimeEntryInput,
  TimeEntryRecord,
  TimesheetViewerAccessRecord,
  TimesheetViewerContractRecord,
  UpdateAnomalyReportInput,
  UpdateClientInput,
  UpdateContractInput,
  UpdateInvoiceInput,
  UpdatePaymentInput,
  UpdateTimeEntryInput,
  UpdateWorkspaceInput,
  ViewerInviteTokenRecord,
  WorkspaceMemberRecord,
  WorkspaceRecord,
  WorkspaceSettingsRecord,
} from "@/domain/persistence-types";
import type {
  AnalyticsFilter,
  AnalyticsPeriod,
  MonthlyHoursAnalytics,
  DailyAnalytics,
  ClientAllocation,
  ContractAllocationFact,
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
  listForUser(userId: string): Promise<WorkspaceMemberRecord[]>;
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

export type RunInTransaction = <T>(
  work: (repositories: PersistenceRepositories) => Promise<T>,
) => Promise<T>;

export type ContractRepository = {
  createContract(
    workspaceId: string,
    input: CreateContractInput,
  ): Promise<ContractRecord>;
  getContract(
    workspaceId: string,
    contractId: string,
  ): Promise<ContractRecord | null>;
  lockContract(
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

/**
 * Persistence filter for workspace invoice listing / summary.
 * amountStatus and overdue are application-layer filters (need payments).
 */
export type WorkspaceInvoiceFilter = {
  tracking?: InvoiceTrackingFilter;
  period?: {
    startDate: Date;
    endDate: Date;
  };
  clientId?: string;
  contractId?: string;
};

/** Invoice row with workspace-safe client identity for list views. */
export type InvoiceWorkspaceListRecord = InvoiceRecord & {
  clientId: string;
  clientName: string;
};

export type InvoiceRepository = {
  createInvoice(
    workspaceId: string,
    input: CreateInvoiceInput,
  ): Promise<InvoiceRecord>;
  getInvoice(
    workspaceId: string,
    invoiceId: string,
  ): Promise<InvoiceRecord | null>;
  lockInvoice(
    workspaceId: string,
    invoiceId: string,
  ): Promise<InvoiceRecord | null>;
  listInvoicesForContract(
    workspaceId: string,
    contractId: string,
    tracking?: InvoiceTrackingFilter,
  ): Promise<InvoiceRecord[]>;
  listInvoicesForWorkspace(
    workspaceId: string,
    filter?: WorkspaceInvoiceFilter,
  ): Promise<InvoiceWorkspaceListRecord[]>;
  updateInvoice(
    workspaceId: string,
    invoiceId: string,
    input: UpdateInvoiceInput,
  ): Promise<InvoiceRecord>;
  voidInvoice(workspaceId: string, invoiceId: string): Promise<InvoiceRecord>;
  existsForContract(workspaceId: string, contractId: string): Promise<boolean>;
};

export type PaymentRepository = {
  createPayment(
    workspaceId: string,
    input: CreatePaymentInput,
  ): Promise<PaymentRecord>;
  getPayment(
    workspaceId: string,
    paymentId: string,
  ): Promise<PaymentRecord | null>;
  listPaymentsForInvoice(
    workspaceId: string,
    invoiceId: string,
  ): Promise<PaymentRecord[]>;
  listPaymentsForInvoices(
    workspaceId: string,
    invoiceIds: readonly string[],
  ): Promise<PaymentRecord[]>;
  updatePayment(
    workspaceId: string,
    paymentId: string,
    input: UpdatePaymentInput,
  ): Promise<PaymentRecord>;
  deletePayment(workspaceId: string, paymentId: string): Promise<void>;
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
   * Pass `periodStart: null` for period-less ALLOCATION_* alerts.
   */
  findActiveAlertByContractAndType(
    workspaceId: string,
    contractId: string,
    type: AlertType,
    periodStart: Date | null,
  ): Promise<AlertRecord | null>;
  /**
   * Returns the currently-active payment alert for
   * (workspaceId, invoiceId, type, resolvedAt IS NULL).
   * Independent of the deduplication key after re-trigger.
   */
  findActiveAlertByInvoiceAndType(
    workspaceId: string,
    invoiceId: string,
    type: AlertType,
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
    filter?: AnalyticsFilter,
  ): Promise<ClientAllocation[]>;
  getContractUtilizations(
    workspaceId: string,
    period: AnalyticsPeriod,
    filter?: AnalyticsFilter,
  ): Promise<ContractUtilization[]>;
  listTimeEntriesForPeriod(
    workspaceId: string,
    period: AnalyticsPeriod,
    filter?: AnalyticsFilter,
  ): Promise<TimeEntryRecord[]>;
  listExpectedContracts(
    workspaceId: string,
    period: AnalyticsPeriod,
    filter?: AnalyticsFilter,
  ): Promise<ExpectedContractFact[]>;
  getContractAllocationFact(
    workspaceId: string,
    contractId: string,
  ): Promise<ContractAllocationFact | null>;
  listContractAllocationFacts(
    workspaceId: string,
    filter?: AnalyticsFilter,
  ): Promise<ContractAllocationFact[]>;
};

export type PersistenceRepositories = {
  workspaces: WorkspaceRepository;
  members: WorkspaceMemberRepository;
  settings: WorkspaceSettingsRepository;
  clients: ClientRepository;
  contracts: ContractRepository;
  invoices: InvoiceRepository;
  payments: PaymentRepository;
  timeEntries: TimeEntryRepository;
  alerts: AlertRepository;
  notifications: NotificationRepository;
  analytics: AnalyticsRepository;
  viewerAccess: ViewerAccessRepository;
  viewerTokens: ViewerInviteTokenRepository;
  anomalyReports: AnomalyReportRepository;
};

export type ViewerAccessRepository = {
  create(
    workspaceId: string,
    input: CreateViewerAccessInput,
  ): Promise<TimesheetViewerAccessRecord>;
  getById(
    workspaceId: string,
    viewerAccessId: string,
  ): Promise<TimesheetViewerAccessRecord | null>;
  findByWorkspaceAndEmail(
    workspaceId: string,
    email: string,
  ): Promise<TimesheetViewerAccessRecord | null>;
  getActiveAccess(
    workspaceId: string,
    userId: string,
  ): Promise<TimesheetViewerAccessRecord | null>;
  listActiveByUserId(userId: string): Promise<TimesheetViewerAccessRecord[]>;
  listForUser(
    userId: string,
    status?: "PENDING" | "ACTIVE" | "REVOKED",
  ): Promise<TimesheetViewerAccessRecord[]>;
  listForWorkspace(
    workspaceId: string,
    status?: "PENDING" | "ACTIVE" | "REVOKED",
  ): Promise<TimesheetViewerAccessRecord[]>;
  activate(
    workspaceId: string,
    viewerAccessId: string,
    userId: string,
    activatedAt: Date,
  ): Promise<TimesheetViewerAccessRecord>;
  revoke(
    workspaceId: string,
    viewerAccessId: string,
  ): Promise<TimesheetViewerAccessRecord>;
  delete(workspaceId: string, viewerAccessId: string): Promise<void>;
  authorizeContract(
    workspaceId: string,
    input: AuthorizeContractInput,
  ): Promise<TimesheetViewerContractRecord>;
  listAuthorizedContracts(
    workspaceId: string,
    viewerAccessId: string,
  ): Promise<TimesheetViewerContractRecord[]>;
  revokeContractAuthorization(
    workspaceId: string,
    viewerAccessId: string,
    contractId: string,
  ): Promise<void>;
};

export type ViewerInviteTokenRepository = {
  create(
    workspaceId: string,
    input: CreateInviteTokenInput,
  ): Promise<ViewerInviteTokenRecord>;
  findByTokenHashForUpdate(
    tokenHash: string,
  ): Promise<ViewerInviteTokenRecord | null>;
  markAccepted(
    workspaceId: string,
    tokenId: string,
    acceptedAt: Date,
  ): Promise<ViewerInviteTokenRecord>;
  invalidateAllForViewerAccess(
    workspaceId: string,
    viewerAccessId: string,
  ): Promise<void>;
};

export type AnomalyReportRepository = {
  create(
    workspaceId: string,
    input: CreateAnomalyReportInput,
  ): Promise<AnomalyReportRecord>;
  getById(
    workspaceId: string,
    reportId: string,
  ): Promise<AnomalyReportRecord | null>;
  listForWorkspace(
    workspaceId: string,
    status?: AnomalyReportStatus,
  ): Promise<AnomalyReportRecord[]>;
  listForViewerAccess(
    workspaceId: string,
    viewerAccessId: string,
    status?: AnomalyReportStatus,
  ): Promise<AnomalyReportRecord[]>;
  countReportsForViewerSince(
    workspaceId: string,
    viewerAccessId: string,
    since: Date,
  ): Promise<number>;
  update(
    workspaceId: string,
    reportId: string,
    input: UpdateAnomalyReportInput,
  ): Promise<AnomalyReportRecord>;
};
