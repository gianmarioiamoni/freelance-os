// tests/integration/analytics/analytics-weekly.test.ts
//
// Integration tests for getWeeklyAnalytics (F-104-013, P105-03).
// Proves:
//   1. Weekly totals equal the arithmetic sum of their daily rows.
//   2. Weekly aggregation correctly composes from getDailyAnalytics.
//   3. Workspace isolation is preserved.
//   4. Membership guard is preserved.
//   5. Empty weeks return zero totals.

import { beforeEach, describe, expect, it } from "vitest";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { getDateRangePeriod } from "@/lib/analytics-periods";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import { createWorkspaceGraph } from "../persistence/fixtures";
import { date, repositories } from "../persistence/helpers";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

describe("getWeeklyAnalytics — F-104-013 / P105-03", () => {
  let graph: Awaited<ReturnType<typeof createWorkspaceGraph>>;
  let analyticsService: AnalyticsService;
  let context: WorkspaceContext;

  beforeEach(async () => {
    graph = await createWorkspaceGraph(repositories, "Weekly Test");
    analyticsService = new AnalyticsService(
      repositories.analytics,
      repositories.members,
    );
    context = {
      workspaceId: graph.workspaceId,
      userId: graph.userId,
      role: "OWNER",
      timezone: "UTC",
    };
  });

  describe("weekly totals equal the sum of daily rows", () => {
    it("single day in the week: weekly total equals that day", async () => {
      await repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
        userId: graph.userId,
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-09-14"), // Monday
        durationMinutes: 480,
        billable: true,
      });

      const period = getDateRangePeriod(date("2026-09-14"), date("2026-09-20"));
      const weekly = await analyticsService.getWeeklyAnalytics(context, period);

      expect(weekly.totalMinutes).toBe(480);
      expect(weekly.billableMinutes).toBe(480);
      expect(weekly.nonBillableMinutes).toBe(0);

      const dailySum = weekly.days.reduce((s, d) => s + d.totalMinutes, 0);
      expect(dailySum).toBe(weekly.totalMinutes);
    });

    it("multiple days: weekly total equals sum of all daily rows", async () => {
      // Mon + Wed + Fri entries
      await repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
        userId: graph.userId,
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-09-14"), // Monday
        durationMinutes: 480, // 8h billable
        billable: true,
      });
      await repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
        userId: graph.userId,
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-09-16"), // Wednesday
        durationMinutes: 300, // 5h billable
        billable: true,
      });
      await repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
        userId: graph.userId,
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-09-16"), // Wednesday — non-billable
        durationMinutes: 60,
        billable: false,
      });
      await repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
        userId: graph.userId,
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-09-18"), // Friday
        durationMinutes: 240, // 4h billable
        billable: true,
      });

      const period = getDateRangePeriod(date("2026-09-14"), date("2026-09-20"));
      const weekly = await analyticsService.getWeeklyAnalytics(context, period);

      // Totals
      expect(weekly.totalMinutes).toBe(1080);        // 480 + 360 + 240
      expect(weekly.billableMinutes).toBe(1020);     // 480 + 300 + 240
      expect(weekly.nonBillableMinutes).toBe(60);

      // Billable percentage: 1020/1080
      expect(weekly.billablePercentage).toBeCloseTo((1020 / 1080) * 100, 1);

      // Daily rows sum to weekly total
      const dailyTotalSum = weekly.days.reduce((s, d) => s + d.totalMinutes, 0);
      const dailyBillableSum = weekly.days.reduce((s, d) => s + d.billableMinutes, 0);
      const dailyNonBillableSum = weekly.days.reduce((s, d) => s + d.nonBillableMinutes, 0);

      expect(dailyTotalSum).toBe(weekly.totalMinutes);
      expect(dailyBillableSum).toBe(weekly.billableMinutes);
      expect(dailyNonBillableSum).toBe(weekly.nonBillableMinutes);

      // Days with data: Monday, Wednesday, Friday (3 days)
      expect(weekly.days).toHaveLength(3);
    });

    it("billablePercentage is null when week has no entries", async () => {
      const period = getDateRangePeriod(date("2026-09-14"), date("2026-09-20"));
      const weekly = await analyticsService.getWeeklyAnalytics(context, period);

      expect(weekly.totalMinutes).toBe(0);
      expect(weekly.billableMinutes).toBe(0);
      expect(weekly.nonBillableMinutes).toBe(0);
      expect(weekly.billablePercentage).toBeNull();
      expect(weekly.days).toHaveLength(0);
    });

    it("period is attached to the returned WeeklyAnalytics", async () => {
      const period = getDateRangePeriod(date("2026-09-14"), date("2026-09-20"));
      const weekly = await analyticsService.getWeeklyAnalytics(context, period);

      expect(weekly.period).toEqual(period);
    });
  });

  describe("weekly aggregation consistency with daily analytics", () => {
    it("weekly totals exactly match getDailyAnalytics sum for the same period", async () => {
      await repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
        userId: graph.userId,
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-09-14"),
        durationMinutes: 360,
        billable: true,
      });
      await repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
        userId: graph.userId,
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-09-15"),
        durationMinutes: 240,
        billable: false,
      });

      const period = getDateRangePeriod(date("2026-09-14"), date("2026-09-20"));

      const weekly = await analyticsService.getWeeklyAnalytics(context, period);
      const dailyRows = await analyticsService.getDailyAnalytics(context, period);

      const dailyTotal = dailyRows.reduce((s, d) => s + d.totalMinutes, 0);
      const dailyBillable = dailyRows.reduce((s, d) => s + d.billableMinutes, 0);

      expect(weekly.totalMinutes).toBe(dailyTotal);
      expect(weekly.billableMinutes).toBe(dailyBillable);
      expect(weekly.days.length).toBe(dailyRows.length);
    });
  });

  describe("workspace isolation", () => {
    it("weekly analytics only sees the requesting workspace data", async () => {
      const other = await createWorkspaceGraph(repositories, "Other Workspace Weekly");

      // Add entry to the other workspace
      await repositories.timeEntries.recordTimeEntry(other.workspaceId, {
        userId: other.userId,
        clientId: other.clientId,
        contractId: other.contractId,
        workDate: date("2026-09-14"),
        durationMinutes: 999,
        billable: true,
      });

      // Our workspace has no entries
      const period = getDateRangePeriod(date("2026-09-14"), date("2026-09-20"));
      const weekly = await analyticsService.getWeeklyAnalytics(context, period);

      expect(weekly.totalMinutes).toBe(0);
    });
  });

  describe("membership guard", () => {
    it("rejects a non-member caller", async () => {
      const intruderContext: WorkspaceContext = {
        workspaceId: graph.workspaceId,
        userId: "intruder-weekly",
        role: "OWNER",
        timezone: "UTC",
      };

      const period = getDateRangePeriod(date("2026-09-14"), date("2026-09-20"));

      await expect(
        analyticsService.getWeeklyAnalytics(intruderContext, period),
      ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);
    });
  });

  describe("invalid period", () => {
    it("rejects a reversed period", async () => {
      const invalid = { startDate: date("2026-09-20"), endDate: date("2026-09-14") };

      await expect(
        analyticsService.getWeeklyAnalytics(context, invalid),
      ).rejects.toThrow("Invalid period");
    });
  });
});
