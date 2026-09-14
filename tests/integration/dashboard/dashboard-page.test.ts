// tests/integration/dashboard/dashboard-page.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createWorkspaceGraph } from "../persistence/fixtures";
import { repositories } from "../persistence/helpers";

describe("Dashboard Analytics Integration", () => {
  let context: Awaited<ReturnType<typeof createWorkspaceGraph>>;
  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    context = await createWorkspaceGraph(repositories, "Dashboard Test");
    analyticsService = new AnalyticsService(repositories.analytics);
  });

  it("returns empty analytics for new workspace", async () => {
    const workspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER" as const,
    };
    
    const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);
    
    expect(analytics.totalMinutes).toBe(0);
    expect(analytics.billableMinutes).toBe(0);
    expect(analytics.nonBillableMinutes).toBe(0);
    expect(analytics.billablePercentage).toBeNull();
    expect(analytics.clientAllocations).toHaveLength(0);
    expect(analytics.contractUtilizations).toHaveLength(0);
  });

  it("calculates analytics correctly with time entries", async () => {
    const workspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER" as const,
    };

    // Use existing client from workspace graph fixture
    const client1 = await repositories.clients.getClient(context.workspaceId, context.clientId);
    if (!client1) throw new Error("Client not found in workspace graph");
    
    // Create an archived client
    const client2 = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Beta Ltd",
    });
    
    // Archive the client
    await repositories.clients.archiveClient(context.workspaceId, client2.id);

    const contract1 = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client1.id,
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800, // 80 hours
      validFrom: new Date(Date.UTC(2026, 7, 1)), // August 1, 2026
      validTo: null, // Ongoing
    });

    const contract2 = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client2.id,
      billingModel: "DAILY",
      rate: "800.0000",
      currency: "EUR",
      monthlyContractedMinutes: null, // Unlimited
      validFrom: new Date(Date.UTC(2026, 8, 1)), // September 1, 2026
      validTo: new Date(Date.UTC(2026, 11, 31)), // December 31, 2026
    });

    // Create time entries for current month
    const workDate = new Date(Date.UTC(2026, 8, 15)); // September 15, 2026

    // ACME Corp - billable time
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client1.id,
      contractId: contract1.id,
      workDate,
      durationMinutes: 480, // 8 hours
      description: "Development work",
      billable: true,
    });

    // ACME Corp - non-billable time
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client1.id,
      contractId: contract1.id,
      workDate,
      durationMinutes: 120, // 2 hours
      description: "Internal meeting",
      billable: false,
    });

    // Beta Ltd (archived client) - billable time
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client2.id,
      contractId: contract2.id,
      workDate,
      durationMinutes: 360, // 6 hours
      description: "Project work",
      billable: true,
    });

    const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);

    // Verify totals
    expect(analytics.totalMinutes).toBe(960); // 16 hours total
    expect(analytics.billableMinutes).toBe(840); // 14 hours billable
    expect(analytics.nonBillableMinutes).toBe(120); // 2 hours non-billable
    expect(analytics.billablePercentage).toBeCloseTo(87.5, 1); // 14/16 = 87.5%

    // Verify client allocations (should include archived client per PD-104-001)
    expect(analytics.clientAllocations).toHaveLength(2);
    
    const acmeAllocation = analytics.clientAllocations.find(c => c.clientName === client1.companyName)!;
    expect(acmeAllocation.totalMinutes).toBe(600); // 10 hours
    expect(acmeAllocation.billableMinutes).toBe(480); // 8 hours
    expect(acmeAllocation.isArchived).toBe(false);
    expect(acmeAllocation.percentage).toBeCloseTo(62.5, 1); // 600/960

    const betaAllocation = analytics.clientAllocations.find(c => c.clientName === "Beta Ltd")!;
    expect(betaAllocation.totalMinutes).toBe(360); // 6 hours
    expect(betaAllocation.billableMinutes).toBe(360); // 6 hours
    expect(betaAllocation.isArchived).toBe(true); // Archived client
    expect(betaAllocation.percentage).toBeCloseTo(37.5, 1); // 360/960

    // Verify contract utilizations (should use ALL time per PD-104-002)
    expect(analytics.contractUtilizations).toHaveLength(2);
    
    const acmeUtilization = analytics.contractUtilizations.find(c => c.clientName === client1.companyName)!;
    expect(acmeUtilization.consumedMinutes).toBe(600); // All tracked time (billable + non-billable)
    expect(acmeUtilization.contractedMinutes).toBe(4800); // 80 hours
    expect(acmeUtilization.isOngoing).toBe(false);
    expect(acmeUtilization.utilizationPercentage).toBeCloseTo(12.5, 1); // 600/4800

    const betaUtilization = analytics.contractUtilizations.find(c => c.clientName === "Beta Ltd")!;
    expect(betaUtilization.consumedMinutes).toBe(360);
    expect(betaUtilization.contractedMinutes).toBeNull(); // Unlimited contract
    expect(betaUtilization.isOngoing).toBe(true);
    expect(betaUtilization.utilizationPercentage).toBeNull();
  });

  it("respects workspace isolation", async () => {
    const workspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER" as const,
    };

    // Create another workspace with time entries
    const otherContext = await createWorkspaceGraph(repositories, "Other Workspace");

    await repositories.timeEntries.recordTimeEntry(otherContext.workspaceId, {
      userId: otherContext.userId,
      clientId: otherContext.clientId,
      contractId: otherContext.contractId,
      workDate: new Date(Date.UTC(2026, 8, 15)),
      durationMinutes: 480,
      description: "Other workspace work",
      billable: true,
    });

    // Original workspace should still show empty analytics
    const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);
    expect(analytics.totalMinutes).toBe(0);
    expect(analytics.clientAllocations).toHaveLength(0);
    expect(analytics.contractUtilizations).toHaveLength(0);
  });

  it("handles period boundaries correctly", async () => {
    const workspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER" as const,
    };

    // Create time entry outside current month
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: context.clientId,
      contractId: context.contractId,
      workDate: new Date(Date.UTC(2026, 7, 31)), // August 31, 2026 (previous month)
      durationMinutes: 480,
      description: "Previous month work",
      billable: true,
    });

    // Create time entry in current month
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: context.clientId,
      contractId: context.contractId,
      workDate: new Date(Date.UTC(2026, 8, 1)), // September 1, 2026 (current month)
      durationMinutes: 240,
      description: "Current month work",
      billable: true,
    });

    const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);
    
    // Should only include current month's entry
    expect(analytics.totalMinutes).toBe(240);
    expect(analytics.billableMinutes).toBe(240);
  });
});