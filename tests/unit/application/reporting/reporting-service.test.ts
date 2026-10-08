// tests/unit/application/reporting/reporting-service.test.ts
import { describe, expect, it, vi } from "vitest";

import type { AnalyticsService } from "@/application/analytics/analytics-service";
import type { WorkspaceInvoiceService } from "@/application/invoices/workspace-invoice-service";
import { ReportingService } from "@/application/reporting/reporting-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type {
  AccruedRevenue,
  ClientAllocation,
  ContractUtilization,
  ExpectedRevenue,
  MonthlyAnalytics,
} from "@/domain/analytics-types";

const context: WorkspaceContext = {
  workspaceId: "workspace-123",
  userId: "user-1",
  role: "OWNER",
  timezone: "UTC",
};

const period = {
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T00:00:00.000Z"),
};

const utilizations: ContractUtilization[] = [
  {
    contractId: "contract-1",
    clientName: "ACME",
    isArchived: false,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: new Date("2027-01-01T00:00:00.000Z"),
    isOngoing: false,
    consumedMinutes: 120,
    contractedMinutes: 4800,
    utilizationPercentage: 2.5,
    isOutOfValidity: false,
  },
];

const allocations: ClientAllocation[] = [
  {
    clientId: "client-1",
    clientName: "ACME",
    isArchived: false,
    totalMinutes: 120,
    billableMinutes: 120,
    percentage: 100,
  },
];

const accrued: AccruedRevenue = {
  period,
  timezone: "UTC",
  byCurrency: [{ currency: "EUR", unrounded: 160, published: 160 }],
  byContract: [
    { contractId: "contract-1", currency: "EUR", unrounded: 160, published: 160 },
  ],
};

const expected: ExpectedRevenue = {
  period,
  timezone: "UTC",
  byCurrency: [{ currency: "EUR", unrounded: 6400, published: 6400 }],
  byContract: [
    { contractId: "contract-1", currency: "EUR", unrounded: 6400, published: 6400 },
  ],
};

function analyticsStub(overrides: Partial<AnalyticsService> = {}): AnalyticsService {
  return {
    getContractUtilizations: vi.fn().mockResolvedValue(utilizations),
    getAccruedRevenue: vi.fn().mockResolvedValue(accrued),
    getExpectedRevenue: vi.fn().mockResolvedValue(expected),
    getClientAllocations: vi.fn().mockResolvedValue(allocations),
    listContractAllocations: vi.fn().mockResolvedValue([]),
    getForecastRevenue: vi.fn().mockResolvedValue(null),
    getMonthlyAnalytics: vi.fn().mockResolvedValue({
      period,
      totalMinutes: 120,
      billableMinutes: 120,
      nonBillableMinutes: 0,
      billablePercentage: 100,
      clientAllocations: allocations,
      monthlyHoursAllocations: [],
      contractUtilizations: utilizations,
      accrued,
      expected,
      forecast: null,
    } satisfies MonthlyAnalytics),
    ...overrides,
  } as unknown as AnalyticsService;
}

function invoiceStub(
  overrides: Partial<WorkspaceInvoiceService> = {},
): WorkspaceInvoiceService {
  return {
    getWorkspaceInvoiceSummary: vi.fn().mockResolvedValue({
      invoicedByCurrency: [{ currency: "EUR", amount: "2000.0000" }],
      paidByCurrency: [{ currency: "EUR", amount: "800.0000" }],
      outstandingByCurrency: [{ currency: "EUR", amount: "1200.0000" }],
      overdueCount: 1,
    }),
    ...overrides,
  } as unknown as WorkspaceInvoiceService;
}

describe("ReportingService revenue mapping", () => {
  it("maps Accrued and Expected onto ContractReport from AnalyticsService", async () => {
    const analytics = analyticsStub();
    const reporting = new ReportingService(analytics);

    const report = await reporting.getContractReport(context, {
      kind: "custom",
      startDate: period.startDate,
      endDate: period.endDate,
    });

    expect(report.contractUtilizations).toEqual(utilizations);
    expect(report.accrued).toEqual(accrued);
    expect(report.expected).toEqual(expected);
    expect(report.filter).toEqual({});
    expect(report.accrued.byCurrency.map((row) => row.currency)).toEqual(["EUR"]);
    expect(report.forecast).toBeNull();
    expect(report.contractAllocations).toEqual([]);
    expect(analytics.getAccruedRevenue).toHaveBeenCalledWith(context, period);
    expect(analytics.getExpectedRevenue).toHaveBeenCalledWith(context, period);
    expect(analytics.getForecastRevenue).toHaveBeenCalledWith(context, period);
    expect(analytics.listContractAllocations).toHaveBeenCalledWith(context);
    expect(analytics.getContractUtilizations).toHaveBeenCalledWith(context, period);
  });

  it("publishes Forecast and contract allocations from AnalyticsService", async () => {
    const forecast = {
      period,
      timezone: "UTC",
      elapsedPeriod: 15,
      totalPeriod: 15,
      byCurrency: accrued.byCurrency,
      byContract: accrued.byContract,
    };
    const contractAllocations = [
      {
        contractId: "contract-1",
        allocatedMinutes: 1000,
        consumedMinutes: 800,
        remainingMinutes: 200,
        allocationStatus: "WARNING" as const,
      },
    ];
    const analytics = analyticsStub({
      getForecastRevenue: vi.fn().mockResolvedValue(forecast),
      listContractAllocations: vi.fn().mockResolvedValue(contractAllocations),
    });
    const reporting = new ReportingService(analytics);

    const report = await reporting.getContractReport(context, { kind: "month" });

    expect(report.forecast).toEqual(forecast);
    expect(report.contractAllocations).toEqual(contractAllocations);
  });

  it("preserves Expected null semantics on ContractReport", async () => {
    const nullExpected: ExpectedRevenue = {
      period,
      timezone: "UTC",
      byCurrency: [],
      byContract: [
        {
          contractId: "daily-1",
          currency: "EUR",
          unrounded: null,
          published: null,
        },
        {
          contractId: "unlimited-1",
          currency: "USD",
          unrounded: null,
          published: null,
        },
      ],
    };
    const analytics = analyticsStub({
      getExpectedRevenue: vi.fn().mockResolvedValue(nullExpected),
    });
    const reporting = new ReportingService(analytics);

    const report = await reporting.getContractReport(context, {
      kind: "custom",
      startDate: period.startDate,
      endDate: period.endDate,
    });

    expect(report.expected.byCurrency).toEqual([]);
    expect(report.expected.byContract).toEqual(nullExpected.byContract);
  });

  it("keeps HoursByClient hours-only", async () => {
    const analytics = analyticsStub();
    const reporting = new ReportingService(analytics);

    const report = await reporting.getHoursByClient(context, {
      kind: "custom",
      startDate: period.startDate,
      endDate: period.endDate,
    });

    expect(report.clientAllocations).toEqual(allocations);
    expect(report.filter).toEqual({});
    expect(report).not.toHaveProperty("accrued");
    expect(report).not.toHaveProperty("expected");
    expect(report).not.toHaveProperty("forecast");
    expect(analytics.getAccruedRevenue).not.toHaveBeenCalled();
    expect(analytics.getExpectedRevenue).not.toHaveBeenCalled();
  });

  it("propagates Client and Contract filters to AnalyticsService", async () => {
    const analytics = analyticsStub();
    const reporting = new ReportingService(analytics);
    const filter = { clientId: "client-1", contractId: "contract-1" };

    const report = await reporting.getContractReport(
      context,
      {
        kind: "custom",
        startDate: period.startDate,
        endDate: period.endDate,
      },
      new Date(),
      filter,
    );
    const hours = await reporting.getHoursByClient(
      context,
      {
        kind: "custom",
        startDate: period.startDate,
        endDate: period.endDate,
      },
      new Date(),
      filter,
    );

    expect(report.filter).toEqual(filter);
    expect(hours.filter).toEqual(filter);
    expect(analytics.getAccruedRevenue).toHaveBeenCalledWith(context, period, filter);
    expect(analytics.getExpectedRevenue).toHaveBeenCalledWith(context, period, filter);
    expect(analytics.getForecastRevenue).toHaveBeenCalledWith(context, period, filter);
    expect(analytics.getContractUtilizations).toHaveBeenCalledWith(context, period, filter);
    expect(analytics.listContractAllocations).toHaveBeenCalledWith(context, filter);
    expect(analytics.getClientAllocations).toHaveBeenCalledWith(context, period, filter);
  });

  it("treats empty Client/Contract IDs as no entity filter", async () => {
    const analytics = analyticsStub();
    const reporting = new ReportingService(analytics);

    const report = await reporting.getContractReport(
      context,
      {
        kind: "custom",
        startDate: period.startDate,
        endDate: period.endDate,
      },
      new Date(),
      { clientId: "  ", contractId: "" },
    );

    expect(report.filter).toEqual({});
    expect(analytics.getAccruedRevenue).toHaveBeenCalledWith(context, period);
    expect(analytics.listContractAllocations).toHaveBeenCalledWith(context);
  });

  it("carries per-month Accrued and Expected on AnnualOverview", async () => {
    const analytics = analyticsStub();
    const reporting = new ReportingService(analytics);

    const report = await reporting.getAnnualOverview(context, 2026);

    expect(report.months).toHaveLength(12);
    for (const month of report.months) {
      expect(month.accrued).toEqual(accrued);
      expect(month.expected).toEqual(expected);
      expect(month.totalMinutes).toBe(120);
      expect(month.forecast).toBeNull();
    }
    expect(report).not.toHaveProperty("filter");
    expect(analytics.getMonthlyAnalytics).toHaveBeenCalledTimes(12);
    expect(analytics.getMonthlyAnalytics).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      }),
    );
    expect(analytics.getAccruedRevenue).not.toHaveBeenCalled();
    expect(analytics.getExpectedRevenue).not.toHaveBeenCalled();
    expect(analytics.listContractAllocations).not.toHaveBeenCalled();
  });
});

describe("ReportingService.getRevenueOverview", () => {
  it("exposes Accrued, Expected, Invoiced, Paid, and Outstanding without mixing currencies", async () => {
    const analytics = analyticsStub();
    const invoices = invoiceStub({
      getWorkspaceInvoiceSummary: vi.fn().mockResolvedValue({
        invoicedByCurrency: [
          { currency: "EUR", amount: "1000.0000" },
          { currency: "USD", amount: "500.0000" },
        ],
        paidByCurrency: [{ currency: "EUR", amount: "400.0000" }],
        outstandingByCurrency: [
          { currency: "EUR", amount: "600.0000" },
          { currency: "USD", amount: "500.0000" },
        ],
        overdueCount: 2,
      }),
    });
    const reporting = new ReportingService(analytics, invoices);

    const overview = await reporting.getRevenueOverview(context, {
      kind: "custom",
      startDate: period.startDate,
      endDate: period.endDate,
    });

    expect(overview.accrued).toEqual(accrued);
    expect(overview.expected).toEqual(expected);
    expect(overview.forecast).toBeNull();
    expect(overview.invoiced).toEqual([
      { currency: "EUR", amount: "1000.0000" },
      { currency: "USD", amount: "500.0000" },
    ]);
    expect(overview.paid).toEqual([{ currency: "EUR", amount: "400.0000" }]);
    expect(overview.outstanding).toEqual([
      { currency: "EUR", amount: "600.0000" },
      { currency: "USD", amount: "500.0000" },
    ]);
    expect(overview.overdueCount).toBe(2);
    expect(analytics.getAccruedRevenue).toHaveBeenCalledWith(context, period);
    expect(analytics.getExpectedRevenue).toHaveBeenCalledWith(context, period);
    expect(invoices.getWorkspaceInvoiceSummary).toHaveBeenCalledWith(context, {
      period: {
        startDate: period.startDate,
        endDate: period.endDate,
      },
    });
  });

  it("returns empty invoice metrics for empty workspace", async () => {
    const analytics = analyticsStub({
      getAccruedRevenue: vi.fn().mockResolvedValue({
        ...accrued,
        byCurrency: [],
        byContract: [],
      }),
      getExpectedRevenue: vi.fn().mockResolvedValue({
        ...expected,
        byCurrency: [],
        byContract: [],
      }),
    });
    const invoices = invoiceStub({
      getWorkspaceInvoiceSummary: vi.fn().mockResolvedValue({
        invoicedByCurrency: [],
        paidByCurrency: [],
        outstandingByCurrency: [],
        overdueCount: 0,
      }),
    });
    const reporting = new ReportingService(analytics, invoices);

    const overview = await reporting.getRevenueOverview(context, {
      kind: "custom",
      startDate: period.startDate,
      endDate: period.endDate,
    });

    expect(overview.accrued.byCurrency).toEqual([]);
    expect(overview.expected.byCurrency).toEqual([]);
    expect(overview.invoiced).toEqual([]);
    expect(overview.paid).toEqual([]);
    expect(overview.outstanding).toEqual([]);
    expect(overview.overdueCount).toBe(0);
  });

  it("leaves Accrued and Expected unchanged from AnalyticsService", async () => {
    const analytics = analyticsStub();
    const invoices = invoiceStub();
    const reporting = new ReportingService(analytics, invoices);

    const overview = await reporting.getRevenueOverview(context, { kind: "month" });

    expect(overview.accrued).toBe(accrued);
    expect(overview.expected).toBe(expected);
  });
});
