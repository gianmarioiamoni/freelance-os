// src/application/ai/ai-service-ports.ts
import type {
  HoursByClientReport,
  PeriodKindRequest,
  ContractReport,
  AnnualOverviewReport,
} from "@/application/reporting/reporting-service";
import type { InvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type {
  AccruedRevenue,
  AnalyticsFilter,
  AnalyticsPeriod,
  ContractAllocation,
  ExpectedRevenue,
  ForecastRevenue,
  MonthlyAnalytics,
} from "@/domain/analytics-types";
import type {
  ClientRecord,
  ClientStatus,
  ContractRecord,
  InvoiceTrackingFilter,
  NotificationRecord,
  PaymentRecord,
} from "@/domain/persistence-types";

export type AiAnalyticsServices = {
  resolvePeriod(
    request: PeriodKindRequest,
    timezone: string,
    now?: Date,
  ): AnalyticsPeriod;
  getCurrentMonthAnalytics(context: WorkspaceContext): Promise<MonthlyAnalytics>;
  getMonthlyAnalytics(
    context: WorkspaceContext,
    period: AnalyticsPeriod,
  ): Promise<MonthlyAnalytics>;
  getAccruedRevenue(
    context: WorkspaceContext,
    period: AnalyticsPeriod,
    filter?: AnalyticsFilter,
  ): Promise<AccruedRevenue>;
  getExpectedRevenue(
    context: WorkspaceContext,
    period: AnalyticsPeriod,
    filter?: AnalyticsFilter,
  ): Promise<ExpectedRevenue>;
  getForecastRevenue(
    context: WorkspaceContext,
    period: AnalyticsPeriod,
    filter?: AnalyticsFilter,
  ): Promise<ForecastRevenue | null>;
  getHoursByClient(
    context: WorkspaceContext,
    request: PeriodKindRequest,
    now?: Date,
    filter?: AnalyticsFilter,
  ): Promise<HoursByClientReport>;
  getContractReport(
    context: WorkspaceContext,
    request: PeriodKindRequest,
    now?: Date,
    filter?: AnalyticsFilter,
  ): Promise<ContractReport>;
  getAnnualOverview(
    context: WorkspaceContext,
    year: number,
    now?: Date,
  ): Promise<AnnualOverviewReport>;
  listContractAllocations(
    context: WorkspaceContext,
    filter?: AnalyticsFilter,
  ): Promise<ContractAllocation[]>;
  getContractAllocation(
    context: WorkspaceContext,
    contractId: string,
  ): Promise<ContractAllocation>;
  listClients(
    context: WorkspaceContext,
    status?: ClientStatus,
  ): Promise<ClientRecord[]>;
  getClient(context: WorkspaceContext, clientId: string): Promise<ClientRecord>;
  listContracts(context: WorkspaceContext): Promise<ContractRecord[]>;
  listContractsForClient(
    context: WorkspaceContext,
    clientId: string,
  ): Promise<ContractRecord[]>;
  getContract(
    context: WorkspaceContext,
    contractId: string,
  ): Promise<ContractRecord>;
  listInvoicesForContract(
    context: WorkspaceContext,
    contractId: string,
    tracking?: InvoiceTrackingFilter,
  ): Promise<InvoiceDerivedView[]>;
  getInvoice(
    context: WorkspaceContext,
    invoiceId: string,
  ): Promise<InvoiceDerivedView>;
  listPaymentsForInvoice(
    context: WorkspaceContext,
    invoiceId: string,
  ): Promise<PaymentRecord[]>;
  getPayment(
    context: WorkspaceContext,
    invoiceId: string,
    paymentId: string,
  ): Promise<PaymentRecord>;
  getNotificationsForUser(context: WorkspaceContext): Promise<NotificationRecord[]>;
};
