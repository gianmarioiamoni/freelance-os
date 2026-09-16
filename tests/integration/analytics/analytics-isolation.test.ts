// tests/integration/analytics/analytics-isolation.test.ts
import { describe, expect, it } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { getDateRangePeriod } from "@/lib/analytics-periods";
import { createWorkspaceGraph } from "../persistence/fixtures";
import { date, repositories } from "../persistence/helpers";

describe("Analytics Workspace Isolation", () => {
  it("should enforce workspace isolation in analytics queries per BR-104-001", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "A");
    const workspaceB = await createWorkspaceGraph(repositories, "B");

    const contextA: WorkspaceContext = {
      workspaceId: workspaceA.workspaceId,
      userId: workspaceA.userId,
      role: "OWNER",
    };

    const contextB: WorkspaceContext = {
      workspaceId: workspaceB.workspaceId,
      userId: workspaceB.userId,
      role: "OWNER",
    };

    // Create time entries in workspace A
    await repositories.timeEntries.recordTimeEntry(workspaceA.workspaceId, {
      userId: workspaceA.userId,
      clientId: workspaceA.clientId,
      contractId: workspaceA.contractId,
      workDate: date("2026-09-01"),
      durationMinutes: 480, // 8 hours
      billable: true,
    });

    await repositories.timeEntries.recordTimeEntry(workspaceA.workspaceId, {
      userId: workspaceA.userId,
      clientId: workspaceA.clientId,
      contractId: workspaceA.contractId,
      workDate: date("2026-09-02"),
      durationMinutes: 240, // 4 hours
      billable: false,
    });

    // Create different time entries in workspace B
    await repositories.timeEntries.recordTimeEntry(workspaceB.workspaceId, {
      userId: workspaceB.userId,
      clientId: workspaceB.clientId,
      contractId: workspaceB.contractId,
      workDate: date("2026-09-01"),
      durationMinutes: 600, // 10 hours
      billable: true,
    });

    const analytics = new AnalyticsService(
      repositories.analytics,
      repositories.members
    );
    const period = getDateRangePeriod(date("2026-09-01"), date("2026-09-02"));

    // Get analytics for both workspaces
    const analyticsA = await analytics.getMonthlyAnalytics(contextA, period);
    const analyticsB = await analytics.getMonthlyAnalytics(contextB, period);

    // Verify workspace A only sees its own data
    expect(analyticsA.totalMinutes).toBe(720); // 8h + 4h
    expect(analyticsA.billableMinutes).toBe(480); // 8h
    expect(analyticsA.nonBillableMinutes).toBe(240); // 4h

    // Verify workspace B only sees its own data
    expect(analyticsB.totalMinutes).toBe(600); // 10h
    expect(analyticsB.billableMinutes).toBe(600); // 10h
    expect(analyticsB.nonBillableMinutes).toBe(0); // 0h

    // Verify client allocations are workspace-isolated
    expect(analyticsA.clientAllocations).toHaveLength(1);
    expect(analyticsA.clientAllocations[0].clientId).toBe(workspaceA.clientId);
    expect(analyticsA.clientAllocations[0].totalMinutes).toBe(720);

    expect(analyticsB.clientAllocations).toHaveLength(1);
    expect(analyticsB.clientAllocations[0].clientId).toBe(workspaceB.clientId);
    expect(analyticsB.clientAllocations[0].totalMinutes).toBe(600);

    // Verify contract utilizations are workspace-isolated
    expect(analyticsA.contractUtilizations).toHaveLength(1);
    expect(analyticsA.contractUtilizations[0].contractId).toBe(workspaceA.contractId);

    expect(analyticsB.contractUtilizations).toHaveLength(1);
    expect(analyticsB.contractUtilizations[0].contractId).toBe(workspaceB.contractId);
  });

  it("should include archived client data per PD-104-001", async () => {
    const workspace = await createWorkspaceGraph(repositories, "archived");

    const context: WorkspaceContext = {
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      role: "OWNER",
    };

    // Record time entry for client
    await repositories.timeEntries.recordTimeEntry(workspace.workspaceId, {
      userId: workspace.userId,
      clientId: workspace.clientId,
      contractId: workspace.contractId,
      workDate: date("2026-09-01"),
      durationMinutes: 480,
      billable: true,
    });

    // Archive the client
    await repositories.clients.archiveClient(workspace.workspaceId, workspace.clientId);

    const analytics = new AnalyticsService(
      repositories.analytics,
      repositories.members
    );
    const period = getDateRangePeriod(date("2026-09-01"), date("2026-09-01"));

    const result = await analytics.getMonthlyAnalytics(context, period);

    // Verify archived client data is included
    expect(result.totalMinutes).toBe(480);
    expect(result.clientAllocations).toHaveLength(1);
    expect(result.clientAllocations[0].isArchived).toBe(true);
    expect(result.clientAllocations[0].totalMinutes).toBe(480);
  });

  it("should handle empty periods correctly", async () => {
    const workspace = await createWorkspaceGraph(repositories, "empty");

    const context: WorkspaceContext = {
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      role: "OWNER",
    };

    const analytics = new AnalyticsService(
      repositories.analytics,
      repositories.members
    );
    const period = getDateRangePeriod(date("2026-08-01"), date("2026-08-31"));

    const result = await analytics.getMonthlyAnalytics(context, period);

    expect(result.totalMinutes).toBe(0);
    expect(result.billableMinutes).toBe(0);
    expect(result.nonBillableMinutes).toBe(0);
    expect(result.billablePercentage).toBe(null); // Per BR-104-011
    expect(result.clientAllocations).toHaveLength(0);
    expect(result.contractUtilizations).toHaveLength(0);
  });

  it("should calculate contract utilization using ALL tracked time per PD-104-002", async () => {
    const workspace = await createWorkspaceGraph(repositories, "utilization");

    // Update contract with monthly limit
    await repositories.contracts.updateContract(
      workspace.workspaceId,
      workspace.contractId,
      {
        validFrom: date("2026-01-01"),
        validTo: date("2026-07-01"),
        billingModel: "HOURLY",
        rate: "80.0000",
        currency: "EUR",
        monthlyContractedMinutes: 4800, // 80 hours
      }
    );

    const context: WorkspaceContext = {
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      role: "OWNER",
    };

    // Record both billable and non-billable time
    await repositories.timeEntries.recordTimeEntry(workspace.workspaceId, {
      userId: workspace.userId,
      clientId: workspace.clientId,
      contractId: workspace.contractId,
      workDate: date("2026-09-01"),
      durationMinutes: 300, // 5h billable
      billable: true,
    });

    await repositories.timeEntries.recordTimeEntry(workspace.workspaceId, {
      userId: workspace.userId,
      clientId: workspace.clientId,
      contractId: workspace.contractId,
      workDate: date("2026-09-01"),
      durationMinutes: 180, // 3h non-billable
      billable: false,
    });

    const analytics = new AnalyticsService(
      repositories.analytics,
      repositories.members
    );
    const period = getDateRangePeriod(date("2026-09-01"), date("2026-09-01"));

    const result = await analytics.getMonthlyAnalytics(context, period);

    // Verify utilization includes ALL time (billable + non-billable)
    expect(result.contractUtilizations).toHaveLength(1);
    expect(result.contractUtilizations[0].consumedMinutes).toBe(480); // 5h + 3h = 8h
    expect(result.contractUtilizations[0].contractedMinutes).toBe(4800); // 80h
    expect(result.contractUtilizations[0].utilizationPercentage).toBe(10); // 8h / 80h = 10%
    expect(result.contractUtilizations[0].isOngoing).toBe(false);
  });

  it("should handle unlimited contracts per PD-104-004", async () => {
    const workspace = await createWorkspaceGraph(repositories, "unlimited");

    const context: WorkspaceContext = {
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      role: "OWNER",
    };

    // Record time entry
    await repositories.timeEntries.recordTimeEntry(workspace.workspaceId, {
      userId: workspace.userId,
      clientId: workspace.clientId,
      contractId: workspace.contractId,
      workDate: date("2026-09-01"),
      durationMinutes: 480,
      billable: true,
    });

    const analytics = new AnalyticsService(
      repositories.analytics,
      repositories.members
    );
    const period = getDateRangePeriod(date("2026-09-01"), date("2026-09-01"));

    const result = await analytics.getMonthlyAnalytics(context, period);

    // Verify unlimited contract handling
    expect(result.contractUtilizations).toHaveLength(1);
    expect(result.contractUtilizations[0].consumedMinutes).toBe(480);
    expect(result.contractUtilizations[0].contractedMinutes).toBe(null); // Unlimited
    expect(result.contractUtilizations[0].utilizationPercentage).toBe(null);
    expect(result.contractUtilizations[0].isOngoing).toBe(true);
  });

  it("should handle future time entries when included in range", async () => {
    const workspace = await createWorkspaceGraph(repositories, "future");

    const context: WorkspaceContext = {
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      role: "OWNER",
    };

    // Record future time entry
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days in future

    await repositories.timeEntries.recordTimeEntry(workspace.workspaceId, {
      userId: workspace.userId,
      clientId: workspace.clientId,
      contractId: workspace.contractId,
      workDate: futureDate,
      durationMinutes: 480,
      billable: true,
    });

    const analytics = new AnalyticsService(
      repositories.analytics,
      repositories.members
    );
    const period = getDateRangePeriod(futureDate, futureDate);

    const result = await analytics.getMonthlyAnalytics(context, period);

    // Verify future entries are included when in range
    expect(result.totalMinutes).toBe(480);
    expect(result.clientAllocations).toHaveLength(1);
  });

  it("should handle daily analytics aggregation correctly", async () => {
    const workspace = await createWorkspaceGraph(repositories, "daily");

    const context: WorkspaceContext = {
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      role: "OWNER",
    };

    // Create multiple days of data
    await repositories.timeEntries.recordTimeEntry(workspace.workspaceId, {
      userId: workspace.userId,
      clientId: workspace.clientId,
      contractId: workspace.contractId,
      workDate: date("2026-09-01"),
      durationMinutes: 480, // 8h
      billable: true,
    });

    await repositories.timeEntries.recordTimeEntry(workspace.workspaceId, {
      userId: workspace.userId,
      clientId: workspace.clientId,
      contractId: workspace.contractId,
      workDate: date("2026-09-02"),
      durationMinutes: 240, // 4h
      billable: false,
    });

    const analytics = new AnalyticsService(
      repositories.analytics,
      repositories.members
    );
    const period = getDateRangePeriod(date("2026-09-01"), date("2026-09-02"));

    const result = await analytics.getDailyAnalytics(context, period);

    expect(result).toHaveLength(2);
    
    const day1 = result.find(d => d.workDate.getTime() === date("2026-09-01").getTime());
    const day2 = result.find(d => d.workDate.getTime() === date("2026-09-02").getTime());

    expect(day1).toBeDefined();
    expect(day1!.totalMinutes).toBe(480);
    expect(day1!.billableMinutes).toBe(480);
    expect(day1!.nonBillableMinutes).toBe(0);

    expect(day2).toBeDefined();
    expect(day2!.totalMinutes).toBe(240);
    expect(day2!.billableMinutes).toBe(0);
    expect(day2!.nonBillableMinutes).toBe(240);
  });
});