// tests/unit/application/reporting/reporting-service.test.ts
import { describe, expect, it, vi } from "vitest";

import type { AnalyticsService } from "@/application/analytics/analytics-service";
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
    getMonthlyAnalytics: vi.fn().mockResolvedValue({
      period,
      totalMinutes: 120,
      billableMinutes: 120,
      nonBillableMinutes: 0,
      billablePercentage: 100,
      clientAllocations: allocations,
      contractUtilizations: utilizations,
      accrued,
      expected,
      forecast: null,
    } satisfies MonthlyAnalytics),
    ...overrides,
  } as unknown as AnalyticsService;
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
    expect(report.accrued.byCurrency.map((row) => row.currency)).toEqual(["EUR"]);
    expect(report).not.toHaveProperty("forecast");
    expect(analytics.getAccruedRevenue).toHaveBeenCalledWith(context, period);
    expect(analytics.getExpectedRevenue).toHaveBeenCalledWith(context, period);
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
    expect(report).not.toHaveProperty("accrued");
    expect(report).not.toHaveProperty("expected");
    expect(report).not.toHaveProperty("forecast");
    expect(analytics.getAccruedRevenue).not.toHaveBeenCalled();
    expect(analytics.getExpectedRevenue).not.toHaveBeenCalled();
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
  });
});
