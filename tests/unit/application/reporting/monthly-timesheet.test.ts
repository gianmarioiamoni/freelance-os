// tests/unit/application/reporting/monthly-timesheet.test.ts
import { describe, expect, it } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { ReportingService } from "@/application/reporting/reporting-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { AccruedRevenue, DailyAnalytics } from "@/domain/analytics-types";
import type { ClientRecord, TimeEntryRecord } from "@/domain/persistence-types";

const context: WorkspaceContext = {
  workspaceId: "ws-1",
  userId: "user-1",
  role: "OWNER",
  timezone: "Europe/Rome",
};

const period = {
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T23:59:59.999Z"),
};

function mockAnalytics(
  accrued: AccruedRevenue,
  dailyAnalytics: DailyAnalytics[],
): AnalyticsService {
  return {
    getAccruedRevenue: async () => accrued,
    getDailyAnalytics: async () => dailyAnalytics,
  } as unknown as AnalyticsService;
}

function mockClientRepo(client: ClientRecord | null) {
  return {
    getClient: async () => client,
  };
}

function mockTimeEntryRepo(entries: TimeEntryRecord[]) {
  return {
    listTimeEntriesForPeriod: async () => entries,
  };
}

describe("ReportingService.getMonthlyTimesheet", () => {
  it("requires clientId", async () => {
    const analytics = mockAnalytics(
      { period, timezone: "Europe/Rome", byCurrency: [], byContract: [] },
      [],
    );
    const service = new ReportingService(analytics);

    await expect(
      service.getMonthlyTimesheet(
        context,
        { kind: "month" },
        "",
        mockClientRepo(null),
        mockTimeEntryRepo([]),
      ),
    ).rejects.toThrow("Client ID is required");
  });

  it("fails if client not found or not in workspace", async () => {
    const analytics = mockAnalytics(
      { period, timezone: "Europe/Rome", byCurrency: [], byContract: [] },
      [],
    );
    const service = new ReportingService(analytics);

    await expect(
      service.getMonthlyTimesheet(
        context,
        { kind: "month" },
        "client-missing",
        mockClientRepo(null),
        mockTimeEntryRepo([]),
      ),
    ).rejects.toThrow("Client not found or does not belong to workspace");
  });

  it("returns empty timesheet for client with no entries", async () => {
    const client: ClientRecord = {
      id: "client-1",
      workspaceId: "ws-1",
      companyName: "ACME",
      status: "ACTIVE",
      vatNumber: null,
      taxCode: null,
      address: null,
      contactName: null,
      email: null,
      phone: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const accrued: AccruedRevenue = {
      period,
      timezone: "Europe/Rome",
      byCurrency: [],
      byContract: [],
    };
    const analytics = mockAnalytics(accrued, []);
    const service = new ReportingService(analytics);

    const report = await service.getMonthlyTimesheet(
      context,
      { kind: "month" },
      "client-1",
      mockClientRepo(client),
      mockTimeEntryRepo([]),
    );

    expect(report.clientId).toBe("client-1");
    expect(report.clientName).toBe("ACME");
    expect(report.totalMinutes).toBe(0);
    expect(report.billableMinutes).toBe(0);
    expect(report.accrued).toEqual(accrued);
    expect(report.dailyBreakdown).toEqual([]);
  });

  it("aggregates daily breakdown and entry detail", async () => {
    const client: ClientRecord = {
      id: "client-1",
      workspaceId: "ws-1",
      companyName: "ACME",
      status: "ACTIVE",
      vatNumber: null,
      taxCode: null,
      address: null,
      contactName: null,
      email: null,
      phone: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const accrued: AccruedRevenue = {
      period,
      timezone: "Europe/Rome",
      byCurrency: [{ currency: "EUR", unrounded: 160, published: 160 }],
      byContract: [
        { contractId: "contract-1", currency: "EUR", unrounded: 160, published: 160 },
      ],
    };
    const dailyAnalytics: DailyAnalytics[] = [
      {
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        totalMinutes: 120,
        billableMinutes: 120,
        nonBillableMinutes: 0,
        clientBreakdown: [
          {
            clientId: "client-1",
            clientName: "ACME",
            totalMinutes: 120,
            billableMinutes: 120,
          },
        ],
      },
      {
        workDate: new Date("2026-06-02T00:00:00.000Z"),
        totalMinutes: 60,
        billableMinutes: 60,
        nonBillableMinutes: 0,
        clientBreakdown: [
          {
            clientId: "client-1",
            clientName: "ACME",
            totalMinutes: 60,
            billableMinutes: 60,
          },
        ],
      },
    ];
    const entries: TimeEntryRecord[] = [
      {
        id: "entry-1",
        workspaceId: "ws-1",
        userId: "user-1",
        clientId: "client-1",
        contractId: "contract-1",
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        durationMinutes: 120,
        description: "Task A",
        billable: true,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "80",
        snapshotCurrency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "entry-2",
        workspaceId: "ws-1",
        userId: "user-1",
        clientId: "client-1",
        contractId: "contract-1",
        workDate: new Date("2026-06-02T00:00:00.000Z"),
        durationMinutes: 60,
        description: null,
        billable: true,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "80",
        snapshotCurrency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const analytics = mockAnalytics(accrued, dailyAnalytics);
    const service = new ReportingService(analytics);

    const report = await service.getMonthlyTimesheet(
      context,
      { kind: "month" },
      "client-1",
      mockClientRepo(client),
      mockTimeEntryRepo(entries),
    );

    expect(report.clientId).toBe("client-1");
    expect(report.clientName).toBe("ACME");
    expect(report.totalMinutes).toBe(180);
    expect(report.billableMinutes).toBe(180);
    expect(report.accrued.byCurrency).toEqual([
      { currency: "EUR", unrounded: 160, published: 160 },
    ]);
    expect(report.dailyBreakdown).toHaveLength(2);
    expect(report.dailyBreakdown[0].workDate).toEqual(new Date("2026-06-01T00:00:00.000Z"));
    expect(report.dailyBreakdown[0].totalMinutes).toBe(120);
    expect(report.dailyBreakdown[0].billableMinutes).toBe(120);
    expect(report.dailyBreakdown[0].entries).toHaveLength(1);
    expect(report.dailyBreakdown[0].entries[0].id).toBe("entry-1");
    expect(report.dailyBreakdown[0].entries[0].description).toBe("Task A");
    expect(report.dailyBreakdown[1].workDate).toEqual(new Date("2026-06-02T00:00:00.000Z"));
    expect(report.dailyBreakdown[1].entries[0].description).toBeNull();
  });

  it("filters entries by clientId", async () => {
    const client: ClientRecord = {
      id: "client-1",
      workspaceId: "ws-1",
      companyName: "ACME",
      status: "ACTIVE",
      vatNumber: null,
      taxCode: null,
      address: null,
      contactName: null,
      email: null,
      phone: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const accrued: AccruedRevenue = {
      period,
      timezone: "Europe/Rome",
      byCurrency: [{ currency: "EUR", unrounded: 80, published: 80 }],
      byContract: [
        { contractId: "contract-1", currency: "EUR", unrounded: 80, published: 80 },
      ],
    };
    const dailyAnalytics: DailyAnalytics[] = [
      {
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        totalMinutes: 180,
        billableMinutes: 180,
        nonBillableMinutes: 0,
        clientBreakdown: [
          {
            clientId: "client-1",
            clientName: "ACME",
            totalMinutes: 60,
            billableMinutes: 60,
          },
          {
            clientId: "client-2",
            clientName: "Other",
            totalMinutes: 120,
            billableMinutes: 120,
          },
        ],
      },
    ];
    const entries: TimeEntryRecord[] = [
      {
        id: "entry-1",
        workspaceId: "ws-1",
        userId: "user-1",
        clientId: "client-1",
        contractId: "contract-1",
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        durationMinutes: 60,
        description: "Client 1 work",
        billable: true,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "80",
        snapshotCurrency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "entry-2",
        workspaceId: "ws-1",
        userId: "user-1",
        clientId: "client-2",
        contractId: "contract-2",
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        durationMinutes: 120,
        description: "Client 2 work",
        billable: true,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "100",
        snapshotCurrency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const analytics = mockAnalytics(accrued, dailyAnalytics);
    const service = new ReportingService(analytics);

    const report = await service.getMonthlyTimesheet(
      context,
      { kind: "month" },
      "client-1",
      mockClientRepo(client),
      mockTimeEntryRepo(entries),
    );

    expect(report.totalMinutes).toBe(60);
    expect(report.billableMinutes).toBe(60);
    expect(report.dailyBreakdown).toHaveLength(1);
    expect(report.dailyBreakdown[0].entries).toHaveLength(1);
    expect(report.dailyBreakdown[0].entries[0].id).toBe("entry-1");
  });

  it("handles multiple currencies per existing billing logic", async () => {
    const client: ClientRecord = {
      id: "client-1",
      workspaceId: "ws-1",
      companyName: "ACME",
      status: "ACTIVE",
      vatNumber: null,
      taxCode: null,
      address: null,
      contactName: null,
      email: null,
      phone: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const accrued: AccruedRevenue = {
      period,
      timezone: "Europe/Rome",
      byCurrency: [
        { currency: "EUR", unrounded: 80, published: 80 },
        { currency: "USD", unrounded: 100, published: 100 },
      ],
      byContract: [
        { contractId: "contract-1", currency: "EUR", unrounded: 80, published: 80 },
        { contractId: "contract-2", currency: "USD", unrounded: 100, published: 100 },
      ],
    };
    const dailyAnalytics: DailyAnalytics[] = [
      {
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        totalMinutes: 120,
        billableMinutes: 120,
        nonBillableMinutes: 0,
        clientBreakdown: [
          {
            clientId: "client-1",
            clientName: "ACME",
            totalMinutes: 120,
            billableMinutes: 120,
          },
        ],
      },
    ];
    const entries: TimeEntryRecord[] = [
      {
        id: "entry-1",
        workspaceId: "ws-1",
        userId: "user-1",
        clientId: "client-1",
        contractId: "contract-1",
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        durationMinutes: 60,
        description: "EUR contract",
        billable: true,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "80",
        snapshotCurrency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "entry-2",
        workspaceId: "ws-1",
        userId: "user-1",
        clientId: "client-1",
        contractId: "contract-2",
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        durationMinutes: 60,
        description: "USD contract",
        billable: true,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "100",
        snapshotCurrency: "USD",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const analytics = mockAnalytics(accrued, dailyAnalytics);
    const service = new ReportingService(analytics);

    const report = await service.getMonthlyTimesheet(
      context,
      { kind: "month" },
      "client-1",
      mockClientRepo(client),
      mockTimeEntryRepo(entries),
    );

    expect(report.accrued.byCurrency).toHaveLength(2);
    expect(report.accrued.byCurrency[0].currency).toBe("EUR");
    expect(report.accrued.byCurrency[1].currency).toBe("USD");
    expect(report.dailyBreakdown[0].entries).toHaveLength(2);
  });

  it("includes non-billable entries in daily breakdown but not accrued", async () => {
    const client: ClientRecord = {
      id: "client-1",
      workspaceId: "ws-1",
      companyName: "ACME",
      status: "ACTIVE",
      vatNumber: null,
      taxCode: null,
      address: null,
      contactName: null,
      email: null,
      phone: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const accrued: AccruedRevenue = {
      period,
      timezone: "Europe/Rome",
      byCurrency: [{ currency: "EUR", unrounded: 80, published: 80 }],
      byContract: [
        { contractId: "contract-1", currency: "EUR", unrounded: 80, published: 80 },
      ],
    };
    const dailyAnalytics: DailyAnalytics[] = [
      {
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        totalMinutes: 120,
        billableMinutes: 60,
        nonBillableMinutes: 60,
        clientBreakdown: [
          {
            clientId: "client-1",
            clientName: "ACME",
            totalMinutes: 120,
            billableMinutes: 60,
          },
        ],
      },
    ];
    const entries: TimeEntryRecord[] = [
      {
        id: "entry-1",
        workspaceId: "ws-1",
        userId: "user-1",
        clientId: "client-1",
        contractId: "contract-1",
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        durationMinutes: 60,
        description: "Billable",
        billable: true,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "80",
        snapshotCurrency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "entry-2",
        workspaceId: "ws-1",
        userId: "user-1",
        clientId: "client-1",
        contractId: "contract-1",
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        durationMinutes: 60,
        description: "Non-billable",
        billable: false,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "80",
        snapshotCurrency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const analytics = mockAnalytics(accrued, dailyAnalytics);
    const service = new ReportingService(analytics);

    const report = await service.getMonthlyTimesheet(
      context,
      { kind: "month" },
      "client-1",
      mockClientRepo(client),
      mockTimeEntryRepo(entries),
    );

    expect(report.totalMinutes).toBe(120);
    expect(report.billableMinutes).toBe(60);
    expect(report.accrued.byCurrency[0].published).toBe(80);
    expect(report.dailyBreakdown[0].entries).toHaveLength(2);
    expect(report.dailyBreakdown[0].entries[0].billable).toBe(true);
    expect(report.dailyBreakdown[0].entries[1].billable).toBe(false);
  });
});
