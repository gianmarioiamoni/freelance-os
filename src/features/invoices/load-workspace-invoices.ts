// src/features/invoices/load-workspace-invoices.ts
import { listClients } from "@/application/clients/list-clients";
import { listContracts } from "@/application/contracts/list-contracts";
import {
  WorkspaceInvoiceService,
  type WorkspaceInvoiceListItem,
} from "@/application/invoices/workspace-invoice-service";
import { ReportingService } from "@/application/reporting/reporting-service";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { RevenueOverview } from "@/application/reporting/reporting-service";
import { formatValidityInterval } from "@/features/contracts/contract-display";
import {
  parseWorkspaceInvoiceViewState,
  toWorkspaceInvoiceListFilter,
  type WorkspaceInvoiceViewState,
} from "@/features/invoices/workspace-invoice-filters";
import { toReportingPeriodKind } from "@/features/reporting/reporting-types";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";

export type WorkspaceInvoicePageData = {
  view: WorkspaceInvoiceViewState;
  invoices: WorkspaceInvoiceListItem[];
  clients: Array<{ id: string; label: string }>;
  contractLabels: Record<string, string>;
  periodLabel: string;
  revenueOverview: RevenueOverview;
};

export async function loadWorkspaceInvoicesPageData(params: {
  period?: string;
  start?: string;
  end?: string;
  tracking?: string;
  clientId?: string;
}): Promise<WorkspaceInvoicePageData> {
  const context = await getCurrentWorkspaceContext();
  const view = parseWorkspaceInvoiceViewState(params);
  const repositories = createRepositories();
  const analyticsService = new AnalyticsService(
    repositories.analytics,
    repositories.members,
  );
  const invoiceService = new WorkspaceInvoiceService(
    repositories.invoices,
    repositories.payments,
    repositories.clients,
    repositories.contracts,
  );
  const reportingService = new ReportingService(analyticsService, invoiceService);
  const now = new Date();
  const periodKind = toReportingPeriodKind(view.period);
  const listFilter = toWorkspaceInvoiceListFilter(
    view,
    reportingService.resolvePeriod.bind(reportingService),
    context.timezone,
    now,
  );

  const [invoices, clients, contracts, revenueOverview] = await Promise.all([
    invoiceService.listInvoicesForWorkspace(context, listFilter, now),
    listClients(context, repositories.clients),
    listContracts(context, repositories.contracts),
    reportingService.getRevenueOverview(context, periodKind, now),
  ]);

  const clientNameById = new Map(
    clients.map((client) => [client.id, client.companyName]),
  );

  const contractLabels: Record<string, string> = {};
  for (const contract of contracts) {
    const clientName =
      clientNameById.get(contract.clientId) ?? "Client unavailable";
    contractLabels[contract.id] =
      `${clientName} · ${formatValidityInterval(contract.validFrom, contract.validTo)}`;
  }

  return {
    view,
    invoices,
    clients: clients.map((client) => ({
      id: client.id,
      label: client.companyName,
    })),
    contractLabels,
    periodLabel: formatPeriodLabel(view),
    revenueOverview,
  };
}

function formatPeriodLabel(view: WorkspaceInvoiceViewState): string {
  if (view.period.kind === "custom") {
    return `${view.period.start} - ${view.period.end}`;
  }

  const labels = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
  } as const;

  return labels[view.period.kind];
}
