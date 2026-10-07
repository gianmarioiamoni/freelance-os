// src/application/reporting/reporting-service.ts
import type {
  AccruedRevenue,
  AnalyticsFilter,
  AnalyticsPeriod,
  ClientAllocation,
  ContractAllocation,
  ContractUtilization,
  ExpectedRevenue,
  ForecastRevenue,
  MonthlyAnalytics,
  ReportingPeriodKind,
} from "@/domain/analytics-types";
import {
  normalizeAnalyticsFilter,
  optionalAnalyticsFilter,
} from "@/application/analytics/analytics-filter";
import type { AnalyticsService } from "@/application/analytics/analytics-service";
import type {
  CurrencyAmount,
  WorkspaceInvoiceService,
} from "@/application/invoices/workspace-invoice-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import {
  getTodayPeriod,
  getCurrentWeekPeriod,
  getCurrentMonthPeriod,
  getCurrentYearPeriod,
  getDateRangePeriod,
  isValidPeriod,
} from "@/lib/analytics-periods";

// ---------------------------------------------------------------------------
// Period request type
// ---------------------------------------------------------------------------

/**
 * Validated period-kind request.
 * Mirrors ReportingPeriodKind from the domain but used as the service input.
 */
export type PeriodKindRequest = ReportingPeriodKind;

// ---------------------------------------------------------------------------
// Reporting output types
// ---------------------------------------------------------------------------

/**
 * Full contract report for a period.
 *
 * BR-105-018: includes all relevant contracts (validity overlap ∪ in-period
 * consumption). Zero-consumption contracts appear with 0h / capacity / 0%.
 * Out-of-validity time is retained and flagged.
 */
export type ContractReport = {
  period: AnalyticsPeriod;
  periodKind: ReportingPeriodKind;
  filter: AnalyticsFilter;
  contractUtilizations: ContractUtilization[];
  contractAllocations: ContractAllocation[];
  accrued: AccruedRevenue;
  expected: ExpectedRevenue;
  forecast: ForecastRevenue | null;
};

/**
 * Hours-by-client report for a period.
 */
export type HoursByClientReport = {
  period: AnalyticsPeriod;
  periodKind: ReportingPeriodKind;
  filter: AnalyticsFilter;
  clientAllocations: ClientAllocation[];
};

/**
 * Annual overview: monthly analytics buckets for each month in a year period.
 */
export type AnnualOverviewReport = {
  period: AnalyticsPeriod;
  periodKind: ReportingPeriodKind;
  months: MonthlyAnalytics[];
};

/**
 * Unified revenue overview for dashboard/reporting (R2.2-E01-P02).
 *
 * Accrued/Expected/Forecast remain AnalyticsService-owned.
 * Invoiced/Paid/Outstanding come from WorkspaceInvoiceService.
 * Currencies are never mixed or converted.
 */
export type RevenueOverview = {
  period: AnalyticsPeriod;
  periodKind: ReportingPeriodKind;
  accrued: AccruedRevenue;
  expected: ExpectedRevenue;
  forecast: ForecastRevenue | null;
  invoiced: CurrencyAmount[];
  paid: CurrencyAmount[];
  outstanding: CurrencyAmount[];
  overdueCount: number;
};

/**
 * Monthly timesheet report for a client (R2.2-STABILIZATION-03).
 *
 * Primary reporting experience answering:
 * "How many hours did I work for this client this month,
 * how were those hours distributed across the days,
 * and how much should I invoice?"
 *
 * Reuses authoritative billing calculation (calculateAccruedRevenue).
 * Currencies remain strictly separated; no FX or mixed totals.
 * Contract validity behavior unchanged from existing AnalyticsService.
 */
export type MonthlyTimesheetReport = {
  period: AnalyticsPeriod;
  periodKind: ReportingPeriodKind;
  clientId: string;
  clientName: string;
  totalMinutes: number;
  billableMinutes: number;
  accrued: AccruedRevenue;
  dailyBreakdown: TimesheetDayDetail[];
};

/**
 * Daily breakdown for a timesheet report.
 * TimeEntry details are provided for expandable UI display.
 */
export type TimesheetDayDetail = {
  workDate: Date;
  totalMinutes: number;
  billableMinutes: number;
  entries: TimesheetEntryDetail[];
};

/**
 * TimeEntry detail for expandable daily rows.
 * Reuses existing TimeEntry fields; no new domain semantics.
 */
export type TimesheetEntryDetail = {
  id: string;
  contractId: string;
  durationMinutes: number;
  description: string | null;
  billable: boolean;
};

const EMPTY_INVOICE_AMOUNTS: CurrencyAmount[] = [];

// ---------------------------------------------------------------------------
// Reporting service
// ---------------------------------------------------------------------------

/**
 * Thin, validated, workspace-scoped reporting query layer (P105-04).
 *
 * Responsibilities:
 * - Accept a validated period request and resolve it into an `AnalyticsPeriod`
 *   using `Workspace.timezone` (BR-105-014).
 * - Propagate optional workspace-scoped Client/Contract filters.
 * - Orchestrate shared analytics calls - AnalyticsService owns ALL arithmetic.
 * - Orchestrate invoice revenue metrics via WorkspaceInvoiceService (R2.2-E01).
 * - Fail closed for invalid input (BR-105-010).
 *
 * Non-goals:
 * - No percentage, average, capacity, or utilization arithmetic here.
 * - No pro-rata formula here - it lives in AnalyticsService.
 * - No Accrued / Expected / Forecast / allocation formula here - AnalyticsService is the owner.
 * - No invoice/payment arithmetic here - WorkspaceInvoiceService is the owner.
 * - No rollover or expiry semantics (OBD-012 open).
 * - No FX or mixed-currency total.
 */
export class ReportingService {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly invoices: WorkspaceInvoiceService | null = null,
  ) {}

  /**
   * Resolves a period-kind request into an `AnalyticsPeriod` using the
   * workspace timezone (BR-105-014).
   *
   * Fails closed if the period kind is unknown or if a custom range has
   * startDate > endDate.
   */
  resolvePeriod(
    request: PeriodKindRequest,
    timezone: string,
    now: Date = new Date(),
  ): AnalyticsPeriod {
    const VALID_KINDS = new Set(["today", "week", "month", "year", "custom"]);
    if (!request || !VALID_KINDS.has(request.kind)) {
      throw new ReportingError(`Unknown period kind: ${String((request as { kind?: unknown })?.kind)}`);
    }

    if (request.kind === "today") return getTodayPeriod(timezone, now);
    if (request.kind === "week") return getCurrentWeekPeriod(timezone, now);
    if (request.kind === "month") return getCurrentMonthPeriod(timezone, now);
    if (request.kind === "year") return getCurrentYearPeriod(timezone, now);

    // kind === "custom"
    const { startDate, endDate } = request;
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      throw new ReportingError("Custom period requires valid Date values for startDate and endDate");
    }
    const period = getDateRangePeriod(startDate, endDate);
    if (!isValidPeriod(period)) {
      throw new ReportingError("Invalid custom period: startDate must be <= endDate");
    }
    return period;
  }

  /**
   * Monthly timesheet report for a selected client and month (R2.2-STABILIZATION-03).
   *
   * Returns daily breakdown with expandable TimeEntry detail and authoritative
   * accrued revenue (reuses calculateAccruedRevenue; no billing duplication).
   *
   * Fails closed if clientId is missing or does not belong to the workspace.
   * Contract validity behavior unchanged (existing AnalyticsService semantics).
   * Multiple contracts for one client are aggregated per existing billing logic.
   * Multiple currencies remain strictly separated.
   */
  async getMonthlyTimesheet(
    context: WorkspaceContext,
    request: PeriodKindRequest,
    clientId: string,
    clientRepository: { getClient(workspaceId: string, clientId: string): Promise<{ id: string; companyName: string } | null> },
    timeEntryRepository: { listTimeEntriesForPeriod(workspaceId: string, startDate: Date, endDate: Date): Promise<Array<{ id: string; clientId: string; contractId: string; workDate: Date; durationMinutes: number; description: string | null; billable: boolean }>> },
    now: Date = new Date(),
  ): Promise<MonthlyTimesheetReport> {
    if (!clientId || typeof clientId !== "string" || clientId.length === 0) {
      throw new ReportingError("Client ID is required for timesheet report");
    }

    const period = this.resolvePeriod(request, context.timezone, now);
    const filter: AnalyticsFilter = { clientId };

    const [client, accrued, dailyAnalytics, entries] = await Promise.all([
      clientRepository.getClient(context.workspaceId, clientId),
      this.analytics.getAccruedRevenue(context, period, filter),
      this.analytics.getDailyAnalytics(context, period),
      timeEntryRepository.listTimeEntriesForPeriod(context.workspaceId, period.startDate, period.endDate),
    ]);

    if (!client) {
      throw new ReportingError("Client not found or does not belong to workspace");
    }

    const clientEntries = entries.filter((e) => e.clientId === clientId);
    const entriesByDate = new Map<string, typeof clientEntries>();
    for (const entry of clientEntries) {
      const dateKey = entry.workDate.toISOString().slice(0, 10);
      const dayEntries = entriesByDate.get(dateKey) ?? [];
      dayEntries.push(entry);
      entriesByDate.set(dateKey, dayEntries);
    }

    const clientDailyAnalytics = dailyAnalytics.filter(
      (day) => day.clientBreakdown.some((c) => c.clientId === clientId)
    );

    const dailyBreakdown: TimesheetDayDetail[] = clientDailyAnalytics.map((day) => {
      const clientBreakdown = day.clientBreakdown.find((c) => c.clientId === clientId);
      const dateKey = day.workDate.toISOString().slice(0, 10);
      const dayEntries = entriesByDate.get(dateKey) ?? [];
      return {
        workDate: day.workDate,
        totalMinutes: clientBreakdown?.totalMinutes ?? 0,
        billableMinutes: clientBreakdown?.billableMinutes ?? 0,
        entries: dayEntries.map((e) => ({
          id: e.id,
          contractId: e.contractId,
          durationMinutes: e.durationMinutes,
          description: e.description,
          billable: e.billable,
        })),
      };
    });

    const totalMinutes = dailyBreakdown.reduce((sum, day) => sum + day.totalMinutes, 0);
    const billableMinutes = dailyBreakdown.reduce((sum, day) => sum + day.billableMinutes, 0);

    return {
      period,
      periodKind: request,
      clientId,
      clientName: client.companyName,
      totalMinutes,
      billableMinutes,
      accrued,
      dailyBreakdown,
    };
  }

  /**
   * Returns Accrued, Expected, Forecast, Invoiced, Paid, and Outstanding for a period.
   * Accrued/Expected formulas remain unchanged in AnalyticsService.
   * Invoice metrics are delegated to WorkspaceInvoiceService.
   */
  async getRevenueOverview(
    context: WorkspaceContext,
    request: PeriodKindRequest,
    now: Date = new Date(),
  ): Promise<RevenueOverview> {
    const period = this.resolvePeriod(request, context.timezone, now);

    const [accrued, expected, forecast, invoiceSummary] = await Promise.all([
      this.analytics.getAccruedRevenue(context, period),
      this.analytics.getExpectedRevenue(context, period),
      this.analytics.getForecastRevenue(context, period),
      this.invoices
        ? this.invoices.getWorkspaceInvoiceSummary(context, {
            period: {
              startDate: period.startDate,
              endDate: period.endDate,
            },
          })
        : Promise.resolve({
            invoicedByCurrency: EMPTY_INVOICE_AMOUNTS,
            paidByCurrency: EMPTY_INVOICE_AMOUNTS,
            outstandingByCurrency: EMPTY_INVOICE_AMOUNTS,
            overdueCount: 0,
          }),
    ]);

    return {
      period,
      periodKind: request,
      accrued,
      expected,
      forecast,
      invoiced: invoiceSummary.invoicedByCurrency,
      paid: invoiceSummary.paidByCurrency,
      outstanding: invoiceSummary.outstandingByCurrency,
      overdueCount: invoiceSummary.overdueCount,
    };
  }

  /**
   * Returns the contract report for the given period (BR-105-018).
   *
   * Includes all relevant contracts (validity overlap ∪ in-period consumption).
   * All arithmetic is delegated to AnalyticsService / AnalyticsRepository.
   */
  async getContractReport(
    context: WorkspaceContext,
    request: PeriodKindRequest,
    now: Date = new Date(),
    filter?: AnalyticsFilter,
  ): Promise<ContractReport> {
    const period = this.resolvePeriod(request, context.timezone, now);
    const normalized = normalizeAnalyticsFilter(filter);
    const [contractUtilizations, contractAllocations, accrued, expected, forecast] =
      await Promise.all([
        this.analytics.getContractUtilizations(context, period, ...optionalAnalyticsFilter(normalized)),
        this.analytics.listContractAllocations(context, ...optionalAnalyticsFilter(normalized)),
        this.analytics.getAccruedRevenue(context, period, ...optionalAnalyticsFilter(normalized)),
        this.analytics.getExpectedRevenue(context, period, ...optionalAnalyticsFilter(normalized)),
        this.analytics.getForecastRevenue(context, period, ...optionalAnalyticsFilter(normalized)),
      ]);
    return {
      period,
      periodKind: request,
      filter: normalized ?? {},
      contractUtilizations,
      contractAllocations,
      accrued,
      expected,
      forecast,
    };
  }

  /**
   * Returns hours by client for the given period.
   */
  async getHoursByClient(
    context: WorkspaceContext,
    request: PeriodKindRequest,
    now: Date = new Date(),
    filter?: AnalyticsFilter,
  ): Promise<HoursByClientReport> {
    const period = this.resolvePeriod(request, context.timezone, now);
    const normalized = normalizeAnalyticsFilter(filter);
    const clientAllocations = await this.analytics.getClientAllocations(
      context,
      period,
      ...optionalAnalyticsFilter(normalized),
    );
    return { period, periodKind: request, filter: normalized ?? {}, clientAllocations };
  }

  /**
   * Returns monthly analytics buckets for a year period (annual overview).
   * Each bucket is the full-month analytics for that calendar month.
   */
  async getAnnualOverview(
    context: WorkspaceContext,
    year: number,
    now: Date = new Date(),
  ): Promise<AnnualOverviewReport> {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new ReportingError(`Invalid year: ${year}`);
    }

    const period = this.resolvePeriod({ kind: "year" }, context.timezone, now);

    // One monthly analytics call per calendar month Jan–Dec.
    const months: MonthlyAnalytics[] = await Promise.all(
      Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(Date.UTC(year, i, 1));
        const monthEnd = new Date(Date.UTC(year, i + 1, 0)); // last day of month
        return this.analytics.getMonthlyAnalytics(context, {
          startDate: monthStart,
          endDate: monthEnd,
        });
      }),
    );

    return { period, periodKind: { kind: "year" }, months };
  }
}

/**
 * Reporting-specific error for validation and business rule violations.
 */
export class ReportingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportingError";
  }
}

