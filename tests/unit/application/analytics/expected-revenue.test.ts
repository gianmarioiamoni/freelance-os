// tests/unit/application/analytics/expected-revenue.test.ts
import { describe, expect, it, vi } from "vitest";

import { AnalyticsService, AnalyticsError } from "@/application/analytics/analytics-service";
import type { AnalyticsPeriod, ExpectedContractFact } from "@/domain/analytics-types";
import type { AnalyticsRepository, WorkspaceMemberRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceMemberRecord } from "@/domain/persistence-types";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

const period: AnalyticsPeriod = {
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T00:00:00.000Z"),
};

function contract(overrides: Partial<ExpectedContractFact> = {}): ExpectedContractFact {
  return {
    contractId: "contract-a",
    billingModel: "HOURLY",
    rate: "80.0000",
    currency: "EUR",
    commitmentPercentage: 60,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: new Date("2026-12-31T00:00:00.000Z"),
    ...overrides,
  };
}

function expected(contracts: ExpectedContractFact[], timezone = "UTC") {
  return AnalyticsService.calculateExpectedRevenue(period, contracts, timezone);
}

describe("AnalyticsService Expected Revenue", () => {
  describe("HOURLY / DAILY availability", () => {
    it("HOURLY with commitment percentage is calculable", () => {
      // June 2026: 22 working days × 60% × 8h × 60min = 6336 minutes × $80/60 = $8448
      const result = expected([contract()]);
      expect(result.byCurrency).toEqual([
        { currency: "EUR", unrounded: 8448, published: 8448 },
      ]);
      expect(result.byContract[0]?.unrounded).toBe(8448);
    });

    it("HOURLY without commitment (0%) is excluded from revenue", () => {
      const result = expected([contract({ commitmentPercentage: 0 })]);
      expect(result.byCurrency).toEqual([]);
      expect(result.byContract).toEqual([]);
    });

    it("DAILY is null even when commitment is set", () => {
      const result = expected([
        contract({ billingModel: "DAILY", commitmentPercentage: 60 }),
      ]);
      expect(result.byCurrency).toEqual([]);
      expect(result.byContract[0]?.unrounded).toBeNull();
      expect(result.byContract[0]?.published).toBeNull();
    });
  });

  describe("period overlap and pro-rata", () => {
    it("full-period contract uses the full monthly capacity", () => {
      const result = expected([contract()]);
      expect(result.byContract[0]?.unrounded).toBe(8448);
    });

    it("contract that starts inside the period is pro-rated", () => {
      // June 2026: 22 working days. Contract starts June 16 = 11 remaining working days.
      // Pro-rata: 11/22 × 8448 = 4224
      const result = expected([
        contract({ validFrom: new Date("2026-06-16T00:00:00.000Z") }),
      ]);
      expect(result.byContract[0]?.unrounded).toBe(4224);
    });

    it("contract that ends inside the period is pro-rated", () => {
      // June 2026: 22 working days. Contract ends June 16 (exclusive) = 11 working days.
      // Pro-rata: 11/22 × 8448 = 4224
      const result = expected([
        contract({ validTo: new Date("2026-06-16T00:00:00.000Z") }),
      ]);
      expect(result.byContract[0]?.unrounded).toBe(4224);
    });

    it("contract that spans the period uses the full monthly capacity", () => {
      const result = expected([
        contract({
          validFrom: new Date("2026-03-01T00:00:00.000Z"),
          validTo: new Date("2026-09-01T00:00:00.000Z"),
        }),
      ]);
      expect(result.byContract[0]?.unrounded).toBe(8448);
    });

    it("ongoing contract overlaps through the period end", () => {
      const result = expected([contract({ validTo: null })]);
      expect(result.byContract[0]?.unrounded).toBe(8448);
    });

    it("validFrom on the period start is inclusive", () => {
      const result = expected([
        contract({ validFrom: new Date("2026-06-01T00:00:00.000Z") }),
      ]);
      expect(result.byContract[0]?.unrounded).toBe(8448);
    });

    it("validTo on the period start is exclusive", () => {
      const result = expected([
        contract({ validTo: new Date("2026-06-01T00:00:00.000Z") }),
      ]);
      expect(result.byContract[0]?.unrounded).toBe(0);
      expect(result.byContract[0]?.published).toBe(0);
    });

    it("zero overlap with capacity present is 0, not null", () => {
      const result = expected([
        contract({
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          validTo: new Date("2026-05-01T00:00:00.000Z"),
        }),
      ]);
      expect(result.byContract[0]?.unrounded).toBe(0);
      expect(result.byContract[0]?.published).toBe(0);
    });
  });

  describe("live Contract values", () => {
    it("uses the live Contract rate", () => {
      // June 2026: 22 days × 8 × 60% = 105.6 hours × $120 = $12672
      const result = expected([contract({ rate: "120.0000" })]);
      expect(result.byContract[0]?.unrounded).toBe(12672);
    });

    it("uses the live rate even when a TimeEntry snapshot would differ", () => {
      const result = expected([contract({ rate: "120.0000" })]);
      expect(result.byCurrency[0]?.unrounded).toBe(12672);
      expect(result.byCurrency[0]?.unrounded).not.toBe(8448);
    });

    it("does not read TimeEntry facts", () => {
      const result = expected([contract()]);
      expect(result).not.toHaveProperty("entries");
      expect(result.byContract).toHaveLength(1);
    });
  });

  describe("currency, rounding, empty", () => {
    it("keeps currencies separate with no mixed total", () => {
      const result = expected([
        contract({ contractId: "eur", currency: "EUR", rate: "80.0000" }),
        contract({ contractId: "usd", currency: "USD", rate: "100.0000" }),
      ]);
      expect(result.byCurrency).toEqual([
        { currency: "EUR", unrounded: 8448, published: 8448 },
        { currency: "USD", unrounded: 10560, published: 10560 },
      ]);
      expect(result).not.toHaveProperty("total");
    });

    it("rounds only the published figure, half-up for positive amounts", () => {
      // Single working day: June 15 2026 (Mon). 1 day × 8h × 60% = 4.8h × $21 = $100.80
      // Note: AnalyticsPeriod endDate is INCLUSIVE, so same start/end = 1 day
      const oneDay: AnalyticsPeriod = {
        startDate: new Date("2026-06-15T00:00:00.000Z"),
        endDate: new Date("2026-06-15T00:00:00.000Z"),
      };
      const result = AnalyticsService.calculateExpectedRevenue(
        oneDay,
        [
          contract({
            rate: "21.0000",
            commitmentPercentage: 60,
          }),
        ],
        "UTC",
      );
      expect(result.byCurrency[0]?.unrounded).toBe(100.8);
      expect(result.byCurrency[0]?.published).toBe(101);
    });

    it("rounds a currency total from the unrounded sum", () => {
      // Single working day: 4.8h × $10.40 = $49.92 per contract
      const oneDay: AnalyticsPeriod = {
        startDate: new Date("2026-06-15T00:00:00.000Z"),
        endDate: new Date("2026-06-15T00:00:00.000Z"),
      };
      const result = AnalyticsService.calculateExpectedRevenue(
        oneDay,
        [
          contract({
            contractId: "a",
            rate: "10.4000",
            commitmentPercentage: 60,
          }),
          contract({
            contractId: "b",
            rate: "10.4000",
            commitmentPercentage: 60,
          }),
        ],
        "UTC",
      );
      expect(result.byContract[0]?.published).toBe(50);
      expect(result.byContract[1]?.published).toBe(50);
      expect(result.byCurrency[0]?.unrounded).toBeCloseTo(99.84, 2);
      expect(result.byCurrency[0]?.published).toBe(100);
    });

    it("returns empty figures when there are no relevant contracts", () => {
      const result = expected([]);
      expect(result.byCurrency).toEqual([]);
      expect(result.byContract).toEqual([]);
    });
  });

  describe("getExpectedRevenue orchestration", () => {
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

    function members(member: WorkspaceMemberRecord | null): WorkspaceMemberRepository {
      return {
        getMember: vi.fn().mockResolvedValue(member),
        addMember: vi.fn(),
        listMembers: vi.fn(),
        listMembershipsByUserId: vi.fn(),
      };
    }

    function analytics(
      overrides: Partial<AnalyticsRepository> = {},
    ): AnalyticsRepository {
      return {
        getMonthlyAnalytics: vi.fn(),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn(),
        listTimeEntriesForPeriod: vi.fn(),
        listExpectedContracts: vi.fn().mockResolvedValue([]),
        getContractAllocationFact: vi.fn(),
        listContractAllocationFacts: vi.fn(),
        ...overrides,
      };
    }

    it("rejects invalid periods", async () => {
      const service = new AnalyticsService(analytics(), members(membership));
      await expect(
        service.getExpectedRevenue(context, {
          startDate: new Date("2026-06-30T00:00:00.000Z"),
          endDate: new Date("2026-06-01T00:00:00.000Z"),
        }),
      ).rejects.toThrow(AnalyticsError);
    });

    it("rejects a non-member without reading contracts", async () => {
      const listExpectedContracts = vi.fn();
      const listTimeEntriesForPeriod = vi.fn();
      const service = new AnalyticsService(
        analytics({ listExpectedContracts, listTimeEntriesForPeriod }),
        members(null),
      );

      await expect(service.getExpectedRevenue(context, period)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError,
      );
      expect(listExpectedContracts).not.toHaveBeenCalled();
      expect(listTimeEntriesForPeriod).not.toHaveBeenCalled();
    });

    it("delegates live contracts and does not read TimeEntries", async () => {
      const listExpectedContracts = vi.fn().mockResolvedValue([contract()]);
      const listTimeEntriesForPeriod = vi.fn();
      const service = new AnalyticsService(
        analytics({ listExpectedContracts, listTimeEntriesForPeriod }),
        members(membership),
      );

      const result = await service.getExpectedRevenue(context, period);

      expect(listExpectedContracts).toHaveBeenCalledWith(context.workspaceId, period);
      expect(listTimeEntriesForPeriod).not.toHaveBeenCalled();
      expect(result.byCurrency[0]?.unrounded).toBe(8448);
      expect(result.timezone).toBe("UTC");
    });

    it("passes Client/Contract filter to the Expected contract query", async () => {
      const listExpectedContracts = vi.fn().mockResolvedValue([]);
      const service = new AnalyticsService(
        analytics({ listExpectedContracts }),
        members(membership),
      );
      const filter = { clientId: "client-1", contractId: "contract-1" };

      await service.getExpectedRevenue(context, period, filter);

      expect(listExpectedContracts).toHaveBeenCalledWith(
        context.workspaceId,
        period,
        filter,
      );
    });
  });
});
