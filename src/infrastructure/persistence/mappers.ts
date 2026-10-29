// src/infrastructure/persistence/mappers.ts
import type {
  Alert,
  AnomalyReport,
  Client,
  Contract,
  Invoice,
  Notification,
  Payment,
  TimeEntry,
  TimesheetViewerAccess,
  TimesheetViewerContract,
  ViewerInviteToken,
  Workspace,
  WorkspaceMember,
  WorkspaceSettings,
} from "@prisma/client";

import type {
  AlertRecord,
  AnomalyReportRecord,
  ClientRecord,
  ContractRecord,
  InvoiceRecord,
  NotificationRecord,
  PaymentRecord,
  TimeEntryRecord,
  TimesheetViewerAccessRecord,
  TimesheetViewerContractRecord,
  ViewerInviteTokenRecord,
  WorkspaceMemberRecord,
  WorkspaceRecord,
  WorkspaceSettingsRecord,
} from "@/domain/persistence-types";

export function mapWorkspace(row: Workspace): WorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    currency: row.currency,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapWorkspaceMember(row: WorkspaceMember): WorkspaceMemberRecord {
  return {
    workspaceId: row.workspaceId,
    userId: row.userId,
    role: row.role,
    createdAt: row.createdAt,
  };
}

export function mapWorkspaceSettings(row: WorkspaceSettings): WorkspaceSettingsRecord {
  return {
    workspaceId: row.workspaceId,
    timezone: row.timezone,
    currency: row.currency,
    contractWarningPercent: row.contractWarningPercent,
    monthlyCapacityWarningPercent: row.monthlyCapacityWarningPercent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapClient(row: Client): ClientRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    companyName: row.companyName,
    vatNumber: row.vatNumber,
    taxCode: row.taxCode,
    address: row.address,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapContract(row: Contract): ContractRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    clientId: row.clientId,
    reference: row.reference,
    validFrom: row.validFrom,
    validTo: row.validTo,
    billingModel: row.billingModel,
    rate: row.rate.toFixed(4),
    currency: row.currency,
    commitmentMode: row.commitmentMode,
    commitmentPercentage: row.commitmentPercentage.toNumber(),
    allocatedMinutes: row.allocatedMinutes,
    paymentTermsDays: row.paymentTermsDays,
    paymentTermsNote: row.paymentTermsNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapInvoice(row: Invoice): InvoiceRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    contractId: row.contractId,
    invoiceDate: row.invoiceDate,
    amount: row.amount.toFixed(4),
    currency: row.currency,
    reference: row.reference,
    paymentTermsDays: row.paymentTermsDays,
    dueDate: row.dueDate,
    voidedAt: row.voidedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapPayment(row: Payment): PaymentRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    invoiceId: row.invoiceId,
    paymentDate: row.paymentDate,
    amount: row.amount.toFixed(4),
    currency: row.currency,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapTimeEntry(row: TimeEntry): TimeEntryRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    clientId: row.clientId,
    contractId: row.contractId,
    workDate: row.workDate,
    durationMinutes: row.durationMinutes,
    description: row.description,
    billable: row.billable,
    snapshotBillingModel: row.snapshotBillingModel,
    snapshotRate: row.snapshotRate.toFixed(4),
    snapshotCurrency: row.snapshotCurrency,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapAlert(row: Alert): AlertRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    type: row.type,
    severity: row.severity,
    clientId: row.clientId,
    contractId: row.contractId,
    invoiceId: row.invoiceId,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    deduplicationKey: row.deduplicationKey,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
  };
}

export function mapNotification(row: Notification): NotificationRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    alertId: row.alertId,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

export function mapViewerAccess(
  row: TimesheetViewerAccess,
): TimesheetViewerAccessRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    email: row.email,
    status: row.status,
    invitedAt: row.invitedAt,
    activatedAt: row.activatedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapViewerContract(
  row: TimesheetViewerContract,
): TimesheetViewerContractRecord {
  return {
    viewerAccessId: row.viewerAccessId,
    workspaceId: row.workspaceId,
    contractId: row.contractId,
    displayLabel: row.displayLabel,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapInviteToken(
  row: ViewerInviteToken,
): ViewerInviteTokenRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    viewerAccessId: row.viewerAccessId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    createdAt: row.createdAt,
  };
}

export function mapAnomalyReport(
  row: AnomalyReport,
): AnomalyReportRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    viewerAccessId: row.viewerAccessId,
    timeEntryId: row.timeEntryId,
    workDate: row.workDate,
    message: row.message,
    status: row.status,
    freelanceNotes: row.freelanceNotes,
    createdAt: row.createdAt,
    acknowledgedAt: row.acknowledgedAt,
    resolvedAt: row.resolvedAt,
  };
}
