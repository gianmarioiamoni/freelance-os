// src/application/ai/grounding/minimize-dtos.ts
import { capRows, serializePeriod, type AiPeriodDto } from "@/application/ai/grounding/serialize";
import type {
  AccruedRevenue,
  ClientAllocation,
  ContractAllocation,
  ContractUtilization,
  ExpectedRevenue,
  ForecastRevenue,
  MonthlyAnalytics,
} from "@/domain/analytics-types";
import type {
  AnnualOverviewReport,
  ContractReport,
  HoursByClientReport,
} from "@/application/reporting/reporting-service";
import type { InvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import type {
  ClientRecord,
  ContractRecord,
  NotificationRecord,
  PaymentRecord,
} from "@/domain/persistence-types";

export type AiMoneyDto = {
  currency: string;
  published: number | null;
};

export type AiMonthlyAnalyticsDto = {
  period: AiPeriodDto;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  billablePercentage: number | null;
  clientAllocations: Array<{
    clientName: string;
    totalMinutes: number;
    billableMinutes: number;
    percentage: number | null;
  }>;
  contractUtilizations: Array<{
    clientName: string;
    consumedMinutes: number;
    contractedMinutes: number | null;
    utilizationPercentage: number | null;
    isOutOfValidity: boolean;
  }>;
  accrued: { period: AiPeriodDto; byCurrency: AiMoneyDto[] };
  expected: { period: AiPeriodDto; byCurrency: AiMoneyDto[] };
  forecast: { period: AiPeriodDto; byCurrency: AiMoneyDto[] } | null;
};

function moneyRows(
  rows: ReadonlyArray<{ currency: string; published: number | null }>,
): AiMoneyDto[] {
  return capRows(rows.map((row) => ({ currency: row.currency, published: row.published })));
}

function minimizeAllocations(rows: readonly ClientAllocation[]) {
  return capRows(rows).map((row) => ({
    clientName: row.clientName,
    totalMinutes: row.totalMinutes,
    billableMinutes: row.billableMinutes,
    percentage: row.percentage,
  }));
}

function minimizeUtilizations(rows: readonly ContractUtilization[]) {
  return capRows(rows).map((row) => ({
    clientName: row.clientName,
    consumedMinutes: row.consumedMinutes,
    contractedMinutes: row.contractedMinutes,
    utilizationPercentage: row.utilizationPercentage,
    isOutOfValidity: row.isOutOfValidity,
  }));
}

export function minimizeMonthlyAnalytics(result: MonthlyAnalytics): AiMonthlyAnalyticsDto {
  const period = serializePeriod(result.period);
  return {
    period,
    totalMinutes: result.totalMinutes,
    billableMinutes: result.billableMinutes,
    nonBillableMinutes: result.nonBillableMinutes,
    billablePercentage: result.billablePercentage,
    clientAllocations: minimizeAllocations(result.clientAllocations),
    contractUtilizations: minimizeUtilizations(result.contractUtilizations),
    accrued: { period: serializePeriod(result.accrued.period), byCurrency: moneyRows(result.accrued.byCurrency) },
    expected: {
      period: serializePeriod(result.expected.period),
      byCurrency: moneyRows(result.expected.byCurrency),
    },
    forecast: result.forecast
      ? {
          period: serializePeriod(result.forecast.period),
          byCurrency: moneyRows(result.forecast.byCurrency),
        }
      : null,
  };
}

export function minimizeRevenue(
  result: AccruedRevenue | ExpectedRevenue | ForecastRevenue,
): { period: AiPeriodDto; byCurrency: AiMoneyDto[] } {
  return {
    period: serializePeriod(result.period),
    byCurrency: moneyRows(result.byCurrency),
  };
}

export function minimizeHoursByClient(result: HoursByClientReport) {
  return {
    period: serializePeriod(result.period),
    clientAllocations: minimizeAllocations(result.clientAllocations),
  };
}

export function minimizeContractReport(result: ContractReport) {
  return {
    period: serializePeriod(result.period),
    contractUtilizations: minimizeUtilizations(result.contractUtilizations),
    contractAllocations: capRows(result.contractAllocations).map(minimizeAllocation),
    accrued: minimizeRevenue(result.accrued),
    expected: minimizeRevenue(result.expected),
    forecast: result.forecast ? minimizeRevenue(result.forecast) : null,
  };
}

export function minimizeAllocation(row: ContractAllocation) {
  return {
    allocatedMinutes: row.allocatedMinutes,
    consumedMinutes: row.consumedMinutes,
    remainingMinutes: row.remainingMinutes,
    allocationStatus: row.allocationStatus,
  };
}

export function minimizeAnnualOverview(result: AnnualOverviewReport) {
  return {
    period: serializePeriod(result.period),
    months: capRows(result.months).map((month) => ({
      period: serializePeriod(month.period),
      totalMinutes: month.totalMinutes,
      accrued: minimizeRevenue(month.accrued),
      expected: minimizeRevenue(month.expected),
      forecast: month.forecast ? minimizeRevenue(month.forecast) : null,
    })),
  };
}

export function minimizeClient(row: ClientRecord) {
  return {
    companyName: row.companyName,
    status: row.status,
  };
}

export function minimizeContract(row: ContractRecord) {
  return {
    billingModel: row.billingModel,
    rate: row.rate,
    currency: row.currency,
    validFrom: toIso(row.validFrom),
    validTo: row.validTo ? toIso(row.validTo) : null,
    monthlyContractedMinutes: row.monthlyContractedMinutes,
    allocatedMinutes: row.allocatedMinutes,
  };
}

export function minimizeInvoice(row: InvoiceDerivedView) {
  return {
    invoiceDate: toIso(row.invoiceDate),
    amount: row.amount,
    currency: row.currency,
    reference: row.reference,
    dueDate: row.dueDate ? toIso(row.dueDate) : null,
    trackingState: row.trackingState,
    paidAmount: row.paidAmount,
    amountStatus: row.amountStatus,
    overdue: row.overdue,
  };
}

export function minimizePayment(row: PaymentRecord) {
  return {
    paymentDate: toIso(row.paymentDate),
    amount: row.amount,
    currency: row.currency,
  };
}

export function minimizeNotification(row: NotificationRecord) {
  return {
    type: row.type,
    title: row.title,
    createdAt: toIso(row.createdAt),
    readAt: row.readAt ? toIso(row.readAt) : null,
  };
}

function toIso(date: Date): string {
  return date.toISOString();
}
