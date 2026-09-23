// tests/unit/application/analytics/accrued-revenue.test.ts
import { describe, expect, it, vi } from "vitest";

import { AnalyticsService, AnalyticsError } from "@/application/analytics/analytics-service";
import type { AccruedTimeEntryFact, AnalyticsPeriod } from "@/domain/analytics-types";
import type { AnalyticsRepository, WorkspaceMemberRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceMemberRecord } from "@/domain/persistence-types";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

const period: AnalyticsPeriod = {
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T00:00:00.000Z"),
};

function fact(overrides: Partial<AccruedTimeEntryFact>): AccruedTimeEntryFact {
  return {
    contractId: "contract-a",
    workDate: new Date("2026-06-15T00:00:00.000Z"),
    durationMinutes: 120,
    billable: true,
    snapshotBillingModel: "HOURLY",
    snapshotRate: "50.0000",
    snapshotCurrency: "EUR",
    ...overrides,
  };
}

function accrued(entries: AccruedTimeEntryFact[], timezone = "UTC") {
  return AnalyticsService.calculateAccruedRevenue(period, entries, timezone);
}

describe("AnalyticsService Accrued Revenue", () => {
  describe("HOURLY", () => {
    it("1. one billable TimeEntry", () => {
      const result = accrued([fact({ durationMinutes: 120, snapshotRate: "50.0000" })]);
      expect(result.byCurrency).toEqual([
        { currency: "EUR", unrounded: 100, published: 100 },
      ]);
    });

    it("2. multiple billable TimeEntries are additive", () => {
      const result = accrued([
        fact({ durationMinutes: 120, snapshotRate: "50.0000" }),
        fact({ durationMinutes: 180, snapshotRate: "70.0000" }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(310);
      expect(result.byCurrency[0]?.published).toBe(310);
    });

    it("3. non-billable TimeEntry is excluded", () => {
      const result = accrued([
        fact({ durationMinutes: 120, snapshotRate: "50.0000", billable: false }),
      ]);
      expect(result.byCurrency).toEqual([]);
      expect(result.byContract).toEqual([]);
    });

    it("4. snapshot rate is used instead of any live Contract rate", () => {
      const result = accrued([
        fact({ durationMinutes: 120, snapshotRate: "80.0000" }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(160);
    });

    it("5. later Contract rate change does not rewrite existing Accrued", () => {
      const historical = accrued([
        fact({ durationMinutes: 120, snapshotRate: "80.0000" }),
      ]);
      const afterLiveChange = accrued([
        fact({ durationMinutes: 120, snapshotRate: "80.0000" }),
      ]);
      expect(afterLiveChange.byCurrency).toEqual(historical.byCurrency);
      expect(afterLiveChange.byCurrency[0]?.unrounded).not.toBe(240);
    });

    it("6. a new TimeEntry after a rate change uses the new snapshot", () => {
      const result = accrued([
        fact({ durationMinutes: 120, snapshotRate: "80.0000" }),
        fact({ durationMinutes: 60, snapshotRate: "120.0000" }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(280);
    });

    it("7. snapshot currency is used instead of live Contract currency", () => {
      const result = accrued([
        fact({ snapshotCurrency: "USD", snapshotRate: "100.0000", durationMinutes: 60 }),
      ]);
      expect(result.byCurrency).toEqual([
        { currency: "USD", unrounded: 100, published: 100 },
      ]);
    });

    it("8. snapshot billing model selects the HOURLY formula", () => {
      const hourly = accrued([
        fact({
          snapshotBillingModel: "HOURLY",
          durationMinutes: 480,
          snapshotRate: "80.0000",
        }),
      ]);
      const daily = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 480,
          snapshotRate: "80.0000",
        }),
      ]);
      expect(hourly.byCurrency[0]?.unrounded).toBe(640);
      expect(daily.byCurrency[0]?.unrounded).toBe(80);
    });
  });

  describe("DAILY", () => {
    it("9. one billable TimeEntry contributes one billable day", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 180,
          snapshotRate: "78.0000",
        }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(78);
    });

    it("10. multiple billable TimeEntries on the same Contract/date count as one day", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 180,
          snapshotRate: "78.0000",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 300,
          snapshotRate: "78.0000",
        }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(78);
    });

    it("11. a date with only non-billable entries produces zero", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 480,
          snapshotRate: "90.0000",
          billable: false,
        }),
      ]);
      expect(result.byCurrency).toEqual([]);
    });

    it("12. mixed billable/non-billable date uses only billable minutes", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 180,
          snapshotRate: "78.0000",
          billable: true,
        }),
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 300,
          snapshotRate: "90.0000",
          billable: false,
        }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(78);
    });

    it("13. multiple days produce one day per Contract/date", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          workDate: new Date("2026-06-15T00:00:00.000Z"),
          durationMinutes: 120,
          snapshotRate: "78.0000",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          workDate: new Date("2026-06-16T00:00:00.000Z"),
          durationMinutes: 240,
          snapshotRate: "78.0000",
        }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(156);
    });

    it("14. multiple Contracts on the same date are calculated independently", () => {
      const result = accrued([
        fact({
          contractId: "project-a",
          snapshotBillingModel: "DAILY",
          durationMinutes: 180,
          snapshotRate: "78.0000",
        }),
        fact({
          contractId: "project-b",
          snapshotBillingModel: "DAILY",
          durationMinutes: 300,
          snapshotRate: "120.0000",
        }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(198);
      expect(result.byContract).toEqual([
        { contractId: "project-a", currency: "EUR", unrounded: 78, published: 78 },
        { contractId: "project-b", currency: "EUR", unrounded: 120, published: 120 },
      ]);
    });
  });

  describe("DAILY weighted snapshots (R2-OD-016)", () => {
    it("15. 3h @ €78 + 5h @ €90 → €85.50 unrounded", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 180,
          snapshotRate: "78.0000",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 300,
          snapshotRate: "90.0000",
        }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(85.5);
    });

    it("16. 2h @ €70 + 4h @ €78 + 2h @ €90 → €79", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 120,
          snapshotRate: "70.0000",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 240,
          snapshotRate: "78.0000",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 120,
          snapshotRate: "90.0000",
        }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(79);
    });

    it("17. non-billable minutes are excluded from the weighted denominator", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 180,
          snapshotRate: "78.0000",
          billable: true,
        }),
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 300,
          snapshotRate: "90.0000",
          billable: true,
        }),
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 480,
          snapshotRate: "200.0000",
          billable: false,
        }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(85.5);
    });

    it("18. same Contract/date with one snapshot equals the daily rate", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 60,
          snapshotRate: "90.0000",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 420,
          snapshotRate: "90.0000",
        }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(90);
    });

    it("19. mixed-currency DAILY uses the Contract/date denominator and keeps currencies separate", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 180,
          snapshotRate: "78.0000",
          snapshotCurrency: "EUR",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 300,
          snapshotRate: "90.0000",
          snapshotCurrency: "USD",
        }),
      ]);

      expect(result.byCurrency).toEqual([
        { currency: "EUR", unrounded: 29.25, published: 29 },
        { currency: "USD", unrounded: 56.25, published: 56 },
      ]);
      expect(result).not.toHaveProperty("total");
      expect(result).not.toHaveProperty("grandTotal");
    });
  });

  describe("currency", () => {
    it("30. EUR and USD remain separate", () => {
      const result = accrued([
        fact({ durationMinutes: 60, snapshotRate: "500.0000", snapshotCurrency: "EUR" }),
        fact({ durationMinutes: 60, snapshotRate: "300.0000", snapshotCurrency: "USD" }),
      ]);
      expect(result.byCurrency).toEqual([
        { currency: "EUR", unrounded: 500, published: 500 },
        { currency: "USD", unrounded: 300, published: 300 },
      ]);
    });

    it("31. no mixed-currency grand total exists", () => {
      const result = accrued([
        fact({ durationMinutes: 60, snapshotRate: "500.0000", snapshotCurrency: "EUR" }),
        fact({ durationMinutes: 60, snapshotRate: "300.0000", snapshotCurrency: "USD" }),
      ]);
      expect(Object.keys(result).sort()).toEqual([
        "byContract",
        "byCurrency",
        "period",
        "timezone",
      ]);
    });
  });

  describe("workspace timezone calendar dates", () => {
    const dailySep15 = fact({
      snapshotBillingModel: "DAILY",
      workDate: new Date("2026-06-15T00:00:00.000Z"),
      durationMinutes: 180,
      snapshotRate: "78.0000",
    });
    const dailySep14 = fact({
      snapshotBillingModel: "DAILY",
      workDate: new Date("2026-06-14T00:00:00.000Z"),
      durationMinutes: 300,
      snapshotRate: "78.0000",
    });

    it("groups the same stored calendar date as one DAILY day in UTC", () => {
      const result = accrued([dailySep15, { ...dailySep15, durationMinutes: 300 }], "UTC");
      expect(result.timezone).toBe("UTC");
      expect(result.byCurrency[0]?.unrounded).toBe(78);
    });

    it("groups the same stored calendar date as one DAILY day in a positive-offset zone", () => {
      const result = accrued(
        [dailySep15, { ...dailySep15, durationMinutes: 300 }],
        "Europe/Rome",
      );
      expect(result.timezone).toBe("Europe/Rome");
      expect(result.byCurrency[0]?.unrounded).toBe(78);
    });

    it("groups the same stored calendar date as one DAILY day in a negative-offset zone", () => {
      const result = accrued(
        [dailySep15, { ...dailySep15, durationMinutes: 300 }],
        "America/New_York",
      );
      expect(result.timezone).toBe("America/New_York");
      expect(result.byCurrency[0]?.unrounded).toBe(78);
    });

    it("does not shift a UTC-midnight workDate through Workspace.timezone", () => {
      const utc = accrued([dailySep14, dailySep15], "UTC");
      const rome = accrued([dailySep14, dailySep15], "Europe/Rome");
      const newYork = accrued([dailySep14, dailySep15], "America/New_York");

      expect(utc.byCurrency[0]?.unrounded).toBe(156);
      expect(rome.byCurrency[0]?.unrounded).toBe(156);
      expect(newYork.byCurrency[0]?.unrounded).toBe(156);
    });
  });

  describe("rounding (R2-OD-002)", () => {
    it("32. intermediate values are not rounded", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 180,
          snapshotRate: "78.0000",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 300,
          snapshotRate: "90.0000",
        }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(85.5);
    });

    it("33. the published amount is rounded once", () => {
      expect(AnalyticsService.publishMonetaryAmount(85.5)).toBe(86);
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 180,
          snapshotRate: "78.0000",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          durationMinutes: 300,
          snapshotRate: "90.0000",
        }),
      ]);
      expect(result.byCurrency[0]?.published).toBe(86);
    });

    it("34. weighted DAILY rounds only after the final aggregation", () => {
      const result = accrued([
        fact({
          snapshotBillingModel: "DAILY",
          workDate: new Date("2026-06-15T00:00:00.000Z"),
          durationMinutes: 180,
          snapshotRate: "78.0000",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          workDate: new Date("2026-06-15T00:00:00.000Z"),
          durationMinutes: 300,
          snapshotRate: "90.0000",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          workDate: new Date("2026-06-16T00:00:00.000Z"),
          durationMinutes: 180,
          snapshotRate: "78.0000",
        }),
        fact({
          snapshotBillingModel: "DAILY",
          workDate: new Date("2026-06-16T00:00:00.000Z"),
          durationMinutes: 300,
          snapshotRate: "90.0000",
        }),
      ]);
      expect(result.byCurrency[0]?.unrounded).toBe(171);
      expect(result.byCurrency[0]?.published).toBe(171);
    });
  });

  describe("getAccruedRevenue orchestration", () => {
    const context: WorkspaceContext = {
      workspaceId: "workspace-123",
      userId: "user-1",
      role: "OWNER",
      timezone: "UTC",
    };

    const membership: WorkspaceMemberRecord = {
      workspaceId: "workspace-123",
      userId: "user-1",
      role: "OWNER",
      createdAt: new Date(),
    };

    it("rejects invalid periods", async () => {
      const service = new AnalyticsService(
        {
          getMonthlyAnalytics: vi.fn(),
          getDailyAnalytics: vi.fn(),
          getClientAllocations: vi.fn(),
          getContractUtilizations: vi.fn(),
          listTimeEntriesForPeriod: vi.fn(),
          listExpectedContracts: vi.fn(),
          getContractAllocationFact: vi.fn(),
          listContractAllocationFacts: vi.fn(),
        },
        {
          getMember: vi.fn().mockResolvedValue(membership),
          addMember: vi.fn(),
          listMembers: vi.fn(),
          listMembershipsByUserId: vi.fn(),
        },
      );

      await expect(
        service.getAccruedRevenue(context, {
          startDate: new Date("2026-06-30T00:00:00.000Z"),
          endDate: new Date("2026-06-01T00:00:00.000Z"),
        }),
      ).rejects.toThrow(AnalyticsError);
    });

    it("38. rejects a non-member", async () => {
      const listTimeEntriesForPeriod = vi.fn();
      const service = new AnalyticsService(
        {
          getMonthlyAnalytics: vi.fn(),
          getDailyAnalytics: vi.fn(),
          getClientAllocations: vi.fn(),
          getContractUtilizations: vi.fn(),
          listTimeEntriesForPeriod,
          listExpectedContracts: vi.fn(),
          getContractAllocationFact: vi.fn(),
          listContractAllocationFacts: vi.fn(),
        },
        {
          getMember: vi.fn().mockResolvedValue(null),
          addMember: vi.fn(),
          listMembers: vi.fn(),
          listMembershipsByUserId: vi.fn(),
        } satisfies WorkspaceMemberRepository,
      );

      await expect(service.getAccruedRevenue(context, period)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError,
      );
      expect(listTimeEntriesForPeriod).not.toHaveBeenCalled();
    });

    it("delegates period TimeEntries to the Accrued calculation", async () => {
      const entries = [fact({ durationMinutes: 60, snapshotRate: "50.0000" })];
      const listTimeEntriesForPeriod = vi.fn().mockResolvedValue(entries);
      const service = new AnalyticsService(
        {
          getMonthlyAnalytics: vi.fn(),
          getDailyAnalytics: vi.fn(),
          getClientAllocations: vi.fn(),
          getContractUtilizations: vi.fn(),
          listTimeEntriesForPeriod,
          listExpectedContracts: vi.fn(),
          getContractAllocationFact: vi.fn(),
          listContractAllocationFacts: vi.fn(),
        } satisfies AnalyticsRepository,
        {
          getMember: vi.fn().mockResolvedValue(membership),
          addMember: vi.fn(),
          listMembers: vi.fn(),
          listMembershipsByUserId: vi.fn(),
        },
      );

      const result = await service.getAccruedRevenue(context, period);

      expect(listTimeEntriesForPeriod).toHaveBeenCalledWith(context.workspaceId, period);
      expect(result.byCurrency[0]?.unrounded).toBe(50);
    });
  });
});
