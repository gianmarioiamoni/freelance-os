// src/domain/persistence-types.ts

export type WorkspaceMemberRole = "OWNER" | "MEMBER";
export type ClientStatus = "ACTIVE" | "ARCHIVED";
export type BillingModel = "HOURLY" | "DAILY";
export type AlertType =
  | "CONTRACT_WARNING"
  | "CONTRACT_EXCEEDED"
  | "CAPACITY_WARNING"
  | "CAPACITY_EXCEEDED";
export type AlertSeverity = "INFO" | "WARNING" | "ERROR";

export type WorkspaceRecord = {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkspaceMemberRecord = {
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  createdAt: Date;
};

export type WorkspaceSettingsRecord = {
  workspaceId: string;
  timezone: string;
  currency: string;
  contractWarningPercent: number;
  monthlyCapacityWarningPercent: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ClientRecord = {
  id: string;
  workspaceId: string;
  companyName: string;
  vatNumber: string | null;
  taxCode: string | null;
  address: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ContractRecord = {
  id: string;
  workspaceId: string;
  clientId: string;
  validFrom: Date;
  validTo: Date | null;
  billingModel: BillingModel;
  rate: string;
  currency: string;
  monthlyContractedMinutes: number | null;
  paymentTermsDays: number | null;
  paymentTermsNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TimeEntryRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  clientId: string;
  contractId: string;
  workDate: Date;
  durationMinutes: number;
  description: string | null;
  billable: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AlertRecord = {
  id: string;
  workspaceId: string;
  type: AlertType;
  severity: AlertSeverity;
  clientId: string | null;
  contractId: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  deduplicationKey: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

export type NotificationRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  alertId: string | null;
  type: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

export type CreateWorkspaceInput = {
  name: string;
  timezone: string;
  currency: string;
};

export type UpdateWorkspaceInput = {
  name?: string;
  timezone?: string;
  currency?: string;
};

export type AddWorkspaceMemberInput = {
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
};

export type PutWorkspaceSettingsInput = {
  timezone: string;
  currency: string;
  contractWarningPercent: number;
  monthlyCapacityWarningPercent: number;
};

export type CreateClientInput = {
  companyName: string;
  vatNumber?: string | null;
  taxCode?: string | null;
  address?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  status?: ClientStatus;
};

export type UpdateClientInput = {
  companyName: string;
  vatNumber?: string | null;
  taxCode?: string | null;
  address?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export type CreateContractInput = {
  clientId: string;
  validFrom: Date;
  validTo?: Date | null;
  billingModel: BillingModel;
  rate: string;
  currency: string;
  monthlyContractedMinutes?: number | null;
  paymentTermsDays?: number | null;
  paymentTermsNote?: string | null;
};

export type UpdateContractInput = {
  validFrom: Date;
  validTo?: Date | null;
  billingModel: BillingModel;
  rate: string;
  currency: string;
  monthlyContractedMinutes?: number | null;
  paymentTermsDays?: number | null;
  paymentTermsNote?: string | null;
};

export type RecordTimeEntryInput = {
  userId: string;
  clientId: string;
  contractId: string;
  workDate: Date;
  durationMinutes: number;
  description?: string | null;
  billable: boolean;
};

export type UpdateTimeEntryInput = {
  durationMinutes?: number;
  description?: string | null;
  billable?: boolean;
};

export type CreateAlertInput = {
  type: AlertType;
  severity: AlertSeverity;
  clientId?: string | null;
  contractId?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  deduplicationKey: string;
};

export type CreateNotificationInput = {
  userId: string;
  alertId?: string | null;
  type: string;
  title: string;
  body: string;
};
