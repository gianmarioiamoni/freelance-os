// src/application/ai/create-analytics-services.ts
import type { AiAnalyticsServices } from "@/application/ai/ai-service-ports";
import type { AlertService } from "@/application/alerts/alert-service";
import type { AnalyticsService } from "@/application/analytics/analytics-service";
import { getClient } from "@/application/clients/get-client";
import { listClients } from "@/application/clients/list-clients";
import { getContract } from "@/application/contracts/get-contract";
import { listContracts } from "@/application/contracts/list-contracts";
import { listContractsForClient } from "@/application/contracts/list-contracts-for-client";
import { getInvoice } from "@/application/invoices/get-invoice";
import { listInvoicesForContract } from "@/application/invoices/list-invoices-for-contract";
import { getPayment } from "@/application/payments/get-payment";
import { listPaymentsForInvoice } from "@/application/payments/list-payments-for-invoice";
import type { ReportingService } from "@/application/reporting/reporting-service";
import type {
  ClientRepository,
  ContractRepository,
  InvoiceRepository,
  PaymentRepository,
} from "@/domain/repositories";

export type AnalyticsServiceBindings = {
  analytics: AnalyticsService;
  reporting: ReportingService;
  alerts: AlertService;
  clients: ClientRepository;
  contracts: ContractRepository;
  invoices: InvoiceRepository;
  payments: PaymentRepository;
};

export function bindAnalyticsServices(
  bindings: AnalyticsServiceBindings,
): AiAnalyticsServices {
  const { analytics, reporting, alerts, clients, contracts, invoices, payments } =
    bindings;

  return {
    resolvePeriod: (request, timezone, now) =>
      reporting.resolvePeriod(request, timezone, now),
    getCurrentMonthAnalytics: (context) => analytics.getCurrentMonthAnalytics(context),
    getMonthlyAnalytics: (context, period) =>
      analytics.getMonthlyAnalytics(context, period),
    getAccruedRevenue: (context, period, filter) =>
      analytics.getAccruedRevenue(context, period, filter),
    getExpectedRevenue: (context, period, filter) =>
      analytics.getExpectedRevenue(context, period, filter),
    getForecastRevenue: (context, period, filter) =>
      analytics.getForecastRevenue(context, period, filter),
    getHoursByClient: (context, request, now, filter) =>
      reporting.getHoursByClient(context, request, now, filter),
    getContractReport: (context, request, now, filter) =>
      reporting.getContractReport(context, request, now, filter),
    getAnnualOverview: (context, year, now) =>
      reporting.getAnnualOverview(context, year, now),
    listContractAllocations: (context, filter) =>
      analytics.listContractAllocations(context, filter),
    getContractAllocation: (context, contractId) =>
      analytics.getContractAllocation(context, contractId),
    listClients: (context, status) => listClients(context, clients, status),
    getClient: (context, clientId) => getClient(context, clientId, clients),
    listContracts: (context) => listContracts(context, contracts),
    listContractsForClient: (context, clientId) =>
      listContractsForClient(context, clientId, clients, contracts),
    getContract: (context, contractId) => getContract(context, contractId, contracts),
    listInvoicesForContract: (context, contractId, tracking) =>
      listInvoicesForContract(context, contractId, contracts, invoices, payments, tracking),
    getInvoice: (context, invoiceId) =>
      getInvoice(context, invoiceId, invoices, payments),
    listPaymentsForInvoice: (context, invoiceId) =>
      listPaymentsForInvoice(context, invoiceId, invoices, payments),
    getPayment: (context, invoiceId, paymentId) =>
      getPayment(context, invoiceId, paymentId, invoices, payments),
    getNotificationsForUser: (context) => alerts.getNotificationsForUser(context),
  };
}
