// src/application/alerts/payment-alert-types.ts
import type { AlertConditionOutcome } from "@/application/alerts/alert-evaluation-types";
import type {
  AlertRepository,
  InvoiceRepository,
  NotificationRepository,
  PaymentRepository,
  WorkspaceMemberRepository,
} from "@/domain/repositories";

export const PAYMENT_ALERT_TYPES = [
  "PAYMENT_PARTIAL",
  "PAYMENT_OVERDUE",
  "PAYMENT_MISMATCH",
] as const;

export type PaymentAlertType = (typeof PAYMENT_ALERT_TYPES)[number];

export type PaymentAlertRepositories = {
  alerts: AlertRepository;
  notifications: NotificationRepository;
  members: WorkspaceMemberRepository;
  invoices: InvoiceRepository;
  payments: PaymentRepository;
};

export type PaymentAlertEvaluationResult = {
  invoiceId: string;
  alertsCreated: number;
  alertsResolved: number;
  notificationsCreated: number;
  partial: AlertConditionOutcome;
  overdue: AlertConditionOutcome;
  mismatch: AlertConditionOutcome;
};
