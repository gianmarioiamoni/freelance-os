// tests/integration/analytics/analytics-membership-guard.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import { getCurrentMonthPeriod } from "@/lib/analytics-periods";
import { repositories } from "../persistence/helpers";
import { toWorkspaceContext, type WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceMemberRecord } from "@/domain/persistence-types";

/**
 * Integration tests for service-level workspace membership guard (P105-02, F-104-014).
 * Ensures AnalyticsService rejects non-member access at service level, not just at route level.
 */

describe("AnalyticsService membership guard", () => {
  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    analyticsService = new AnalyticsService(
      repositories.analytics,
      repositories.members
    );
  });

  it("should allow authorized workspace member to access analytics", async () => {
    const workspace = await repositories.workspaces.createWorkspace({
      name: "Authorized Workspace",
      timezone: "UTC",
      currency: "USD",
    });

    await repositories.members.addMember({
      workspaceId: workspace.id,
      userId: "owner-123",
      role: "OWNER",
    });

    const membership = await repositories.members.getMember(
      workspace.id,
      "owner-123"
    );

    const context = toWorkspaceContext(membership as WorkspaceMemberRecord);
    const period = getCurrentMonthPeriod();

    // Should not throw
    const result = await analyticsService.getMonthlyAnalytics(context, period);
    
    expect(result).toBeDefined();
    expect(result.period).toEqual(period);
  });

  it("should reject non-member access to analytics", async () => {
    const workspace = await repositories.workspaces.createWorkspace({
      name: "Owner Workspace",
      timezone: "UTC",
      currency: "USD",
    });

    await repositories.members.addMember({
      workspaceId: workspace.id,
      userId: "owner-456",
      role: "OWNER",
    });

    // Attempt to access analytics with a non-member userId
    const fakeContext: WorkspaceContext = {
      workspaceId: workspace.id,
      userId: "intruder-789",
      role: "OWNER", // Role doesn't matter; membership check is authoritative
    };

    const period = getCurrentMonthPeriod();

    await expect(
      analyticsService.getMonthlyAnalytics(fakeContext, period)
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it("should reject access when workspace does not exist", async () => {
    const { randomUUID } = await import("node:crypto");
    
    const fakeContext: WorkspaceContext = {
      workspaceId: randomUUID(),
      userId: "user-123",
      role: "OWNER",
    };

    const period = getCurrentMonthPeriod();

    await expect(
      analyticsService.getMonthlyAnalytics(fakeContext, period)
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it("should guard getCurrentMonthAnalytics", async () => {
    const workspace = await repositories.workspaces.createWorkspace({
      name: "Test Workspace",
      timezone: "UTC",
      currency: "USD",
    });

    await repositories.members.addMember({
      workspaceId: workspace.id,
      userId: "owner-999",
      role: "OWNER",
    });

    const fakeContext: WorkspaceContext = {
      workspaceId: workspace.id,
      userId: "intruder-111",
      role: "OWNER",
    };

    await expect(
      analyticsService.getCurrentMonthAnalytics(fakeContext)
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it("should guard getDailyAnalytics", async () => {
    const workspace = await repositories.workspaces.createWorkspace({
      name: "Test Workspace",
      timezone: "UTC",
      currency: "USD",
    });

    await repositories.members.addMember({
      workspaceId: workspace.id,
      userId: "owner-999",
      role: "OWNER",
    });

    const fakeContext: WorkspaceContext = {
      workspaceId: workspace.id,
      userId: "intruder-222",
      role: "OWNER",
    };

    const period = getCurrentMonthPeriod();

    await expect(
      analyticsService.getDailyAnalytics(fakeContext, period)
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it("should guard getClientAllocations", async () => {
    const workspace = await repositories.workspaces.createWorkspace({
      name: "Test Workspace",
      timezone: "UTC",
      currency: "USD",
    });

    await repositories.members.addMember({
      workspaceId: workspace.id,
      userId: "owner-999",
      role: "OWNER",
    });

    const fakeContext: WorkspaceContext = {
      workspaceId: workspace.id,
      userId: "intruder-333",
      role: "OWNER",
    };

    const period = getCurrentMonthPeriod();

    await expect(
      analyticsService.getClientAllocations(fakeContext, period)
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it("should guard getContractUtilizations", async () => {
    const workspace = await repositories.workspaces.createWorkspace({
      name: "Test Workspace",
      timezone: "UTC",
      currency: "USD",
    });

    await repositories.members.addMember({
      workspaceId: workspace.id,
      userId: "owner-999",
      role: "OWNER",
    });

    const fakeContext: WorkspaceContext = {
      workspaceId: workspace.id,
      userId: "intruder-444",
      role: "OWNER",
    };

    const period = getCurrentMonthPeriod();

    await expect(
      analyticsService.getContractUtilizations(fakeContext, period)
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });
});
