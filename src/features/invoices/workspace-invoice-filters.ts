// src/features/invoices/workspace-invoice-filters.ts
import type { WorkspaceInvoiceListFilter } from "@/application/invoices/workspace-invoice-service";
import type { InvoiceTrackingFilter } from "@/domain/persistence-types";
import { readInvoiceTrackingParam } from "@/features/invoices/invoice-display";
import {
  parseReportPeriodParam,
  toReportingPeriodKind,
  type ReportPeriodParam,
} from "@/features/reporting/reporting-types";
import type { ReportingService } from "@/application/reporting/reporting-service";

const ENTITY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type WorkspaceInvoiceViewState = {
  period: ReportPeriodParam;
  tracking: InvoiceTrackingFilter;
  clientId?: string;
};

/**
 * Parses /invoices URL search params into view-state.
 * Period defaults to month (same fail-open as reports).
 * Tracking defaults to ACTIVE.
 * Invalid clientId values are ignored.
 */
export function parseWorkspaceInvoiceViewState(params: {
  period?: string;
  start?: string;
  end?: string;
  tracking?: string;
  clientId?: string;
}): WorkspaceInvoiceViewState {
  const clientId = parseOptionalEntityId(params.clientId);

  return {
    period: parseReportPeriodParam(params),
    tracking: readInvoiceTrackingParam(params.tracking),
    ...(clientId ? { clientId } : {}),
  };
}

function parseOptionalEntityId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || !ENTITY_ID_PATTERN.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

/**
 * Builds a /invoices href from view-state.
 * Query order: period, start, end, tracking, clientId.
 */
export function workspaceInvoiceHref(state: WorkspaceInvoiceViewState): string {
  const params = new URLSearchParams();

  if (state.period.kind === "custom") {
    params.set("period", "custom");
    params.set("start", state.period.start);
    params.set("end", state.period.end);
  } else {
    params.set("period", state.period.kind);
  }

  if (state.tracking !== "ACTIVE") {
    params.set("tracking", state.tracking);
  }

  if (state.clientId) {
    params.set("clientId", state.clientId);
  }

  const query = params.toString();
  return query.length > 0 ? `/invoices?${query}` : "/invoices";
}

export function workspaceInvoicePeriodHref(
  period: ReportPeriodParam,
  tracking: InvoiceTrackingFilter,
  clientId?: string,
): string {
  return workspaceInvoiceHref({
    period,
    tracking,
    ...(clientId ? { clientId } : {}),
  });
}

export function workspaceInvoiceTrackingHref(
  current: WorkspaceInvoiceViewState,
  tracking: InvoiceTrackingFilter,
): string {
  return workspaceInvoiceHref({
    ...current,
    tracking,
  });
}

export function workspaceInvoiceClientHref(
  current: WorkspaceInvoiceViewState,
  clientId: string | undefined,
): string {
  return workspaceInvoiceHref({
    period: current.period,
    tracking: current.tracking,
    ...(clientId ? { clientId } : {}),
  });
}

/**
 * Maps page view-state to WorkspaceInvoiceService list filter.
 * Period resolution reuses ReportingService timezone semantics.
 */
export function toWorkspaceInvoiceListFilter(
  view: WorkspaceInvoiceViewState,
  resolvePeriod: ReportingService["resolvePeriod"],
  timezone: string,
  now?: Date,
): WorkspaceInvoiceListFilter {
  const periodKind = toReportingPeriodKind(view.period);
  const period = resolvePeriod(periodKind, timezone, now);

  return {
    tracking: view.tracking,
    period: {
      startDate: period.startDate,
      endDate: period.endDate,
    },
    ...(view.clientId ? { clientId: view.clientId } : {}),
  };
}

export function workspaceInvoiceEmptyCopy(
  tracking: InvoiceTrackingFilter,
): { title: string; description: string } {
  if (tracking === "VOID") {
    return {
      title: "No void invoices",
      description:
        "Void invoices in this workspace for the selected filters will appear here.",
    };
  }

  if (tracking === "ALL") {
    return {
      title: "No invoices",
      description:
        "Invoices across contracts in this workspace for the selected filters will appear here.",
    };
  }

  return {
    title: "No active invoices",
    description:
      "Active invoices across contracts in this workspace for the selected filters will appear here.",
  };
}
