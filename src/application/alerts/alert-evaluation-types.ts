// src/application/alerts/alert-evaluation-types.ts
import type { AlertRecord, NotificationRecord } from "@/domain/persistence-types";

export type AlertConditionOutcome =
  | { action: "created"; alert: AlertRecord; notification: NotificationRecord }
  | { action: "deduplicated" }
  | { action: "resolved"; alert: AlertRecord }
  | { action: "none" };

export type ContractAlertEvaluationResult = {
  contractId: string;
  warning: AlertConditionOutcome;
  exceeded: AlertConditionOutcome;
};

export type AlertEvaluationResult = {
  alertsCreated: number;
  alertsResolved: number;
  notificationsCreated: number;
  contractResults: ContractAlertEvaluationResult[];
};
