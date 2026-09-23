// src/application/alerts/allocation-alert-types.ts
import type { AlertConditionOutcome } from "@/application/alerts/alert-evaluation-types";
import type {
  AlertRepository,
  NotificationRepository,
  WorkspaceMemberRepository,
} from "@/domain/repositories";

export const ALLOCATION_ALERT_TYPES = [
  "ALLOCATION_WARNING",
  "ALLOCATION_EXCEEDED",
] as const;

export type AllocationAlertType = (typeof ALLOCATION_ALERT_TYPES)[number];

export type AllocationAlertRepositories = {
  alerts: AlertRepository;
  notifications: NotificationRepository;
  members: WorkspaceMemberRepository;
};

export type AllocationAlertEvaluationResult = {
  contractId: string;
  alertsCreated: number;
  alertsResolved: number;
  notificationsCreated: number;
  warning: AlertConditionOutcome;
  exceeded: AlertConditionOutcome;
};
