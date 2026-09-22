// src/infrastructure/persistence/mappers.ts
import type {
  Alert,
  Client,
  Contract,
  Invoice,
  Notification,
  TimeEntry,
  Workspace,
  WorkspaceMember,
  WorkspaceSettings,
} from "@prisma/client";

import type {
  AlertRecord,
  ClientRecord,
  ContractRecord,
  InvoiceRecord,
  NotificationRecord,
  TimeEntryRecord,
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
    validFrom: row.validFrom,
    validTo: row.validTo,
    billingModel: row.billingModel,
    rate: row.rate.toFixed(4),
    currency: row.currency,
    monthlyContractedMinutes: row.monthlyContractedMinutes,
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
