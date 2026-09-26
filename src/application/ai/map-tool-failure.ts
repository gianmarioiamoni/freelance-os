// src/application/ai/map-tool-failure.ts
import { AiClarificationError } from "@/application/ai/ai-errors";
import type { AiAskResult } from "@/application/ai/ai-types";
import { AnalyticsError } from "@/application/analytics/analytics-service";
import { ReportingError } from "@/application/reporting/reporting-service";
import { ClientNotFoundError } from "@/domain/client-errors";
import { ContractNotFoundError } from "@/domain/contract-errors";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import { PaymentNotFoundError } from "@/domain/payment-errors";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

export type MappedToolFailure =
  | { kind: "authorization" }
  | {
      kind: "clarification";
      refusalClass: NonNullable<AiAskResult["refusalClass"]>;
    }
  | { kind: "error" };

export function mapToolFailure(error: unknown): MappedToolFailure {
  if (error instanceof UnauthorizedWorkspaceAccessError) {
    return { kind: "authorization" };
  }

  if (error instanceof AiClarificationError) {
    return { kind: "clarification", refusalClass: error.clarificationClass };
  }

  if (
    error instanceof ClientNotFoundError ||
    error instanceof ContractNotFoundError ||
    error instanceof InvoiceNotFoundError ||
    error instanceof PaymentNotFoundError
  ) {
    return { kind: "clarification", refusalClass: "unknown_entity" };
  }

  if (error instanceof AnalyticsError || error instanceof ReportingError) {
    return { kind: "clarification", refusalClass: "invalid_period" };
  }

  return { kind: "error" };
}
