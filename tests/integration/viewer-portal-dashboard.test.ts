// tests/integration/viewer-portal-dashboard.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { getViewerDashboard } from "@/application/timesheet-viewer/get-viewer-dashboard";
import { inviteViewer } from "@/application/timesheet-viewer/invite-viewer";
import { activateViewer } from "@/application/timesheet-viewer/activate-viewer";
import { revokeViewer } from "@/application/timesheet-viewer/revoke-viewer";
import { authorizeContract } from "@/application/timesheet-viewer/authorize-contract";
import { revokeContractAccess } from "@/application/timesheet-viewer/revoke-contract-access";
import { createAnomalyReport } from "@/application/timesheet-viewer/create-anomaly-report";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { prisma } from "@/infrastructure/prisma/client";
import {
  setupTestWorkspace,
  cleanupTestWorkspace,
} from "@/tests/integration/test-fixtures";
import type { TestContext } from "@/tests/integration/test-fixtures";
import {
  ViewerAccessNotFoundError,
  ViewerUnauthorizedError,
} from "@/domain/viewer-errors";

describe("Viewer Portal Dashboard Integration", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestWorkspace(testDb);
    return async () => cleanupTestWorkspace(ctx);
  });

  it("returns dashboard with aggregated metrics for multiple contracts", async () => {
    const repositories = getRepositories();
    const inviteResult = await inviteViewer(
      { workspaceId: ctx.workspace.id },
      "viewer@example.com",
      ctx.user.id,
      new Date(),
      repositories,
    );

    await activateViewer(
      inviteResult.token.token,
      ctx.user.id,
      new Date(),
      repositories,
    );

    await authorizeContract(
      { workspaceId: ctx.workspace.id },
      {
        viewerAccessId: inviteResult.viewerAccess.id,
        contractId: ctx.contract.id,
        displayLabel: "Contract A",
      },
      ctx.user.id,
      new Date(),
      repositories,
    );

    await createTimeEntry(
      { workspaceId: ctx.workspace.id },
      {
        contractId: ctx.contract.id,
        workDate: new Date(2026, 9, 1),
        durationMinutes: 120,
        billable: true,
        description: "Work on Contract A",
      },
      ctx.user.id,
      new Date(),
      repositories,
    );

    await createTimeEntry(
      { workspaceId: ctx.workspace.id },
      {
        contractId: ctx.contract.id,
        workDate: new Date(2026, 9, 2),
        durationMinutes: 180,
        billable: false,
        description: "Non-billable on Contract A",
      },
      ctx.user.id,
      new Date(),
      repositories,
    );

    const dashboard = await getViewerDashboard(
      { workspaceId: ctx.workspace.id },
      inviteResult.viewerAccess.id,
      10,
      2026,
      repositories,
    );

    expect(dashboard.metrics.totalMinutes).toBe(300);
    expect(dashboard.metrics.billableMinutes).toBe(120);
    expect(dashboard.metrics.nonBillableMinutes).toBe(180);
    expect(dashboard.metrics.workingDays).toBe(2);
    expect(dashboard.metrics.totalEntries).toBe(2);
    expect(dashboard.metrics.averageMinutesPerDay).toBe(150);
    expect(dashboard.dailyBreakdown).toHaveLength(2);
  });

  it("blocks access for REVOKED viewer", async () => {
    const repositories = getRepositories();
    const inviteResult = await inviteViewer(
      { workspaceId: ctx.workspace.id },
      "revoked@example.com",
      ctx.user.id,
      new Date(),
      repositories,
    );

    await activateViewer(
      inviteResult.token.token,
      ctx.user.id,
      new Date(),
      repositories,
    );

    await authorizeContract(
      { workspaceId: ctx.workspace.id },
      {
        viewerAccessId: inviteResult.viewerAccess.id,
        contractId: ctx.contract.id,
        displayLabel: "Contract",
      },
      ctx.user.id,
      new Date(),
      repositories,
    );

    await revokeViewer(
      { workspaceId: ctx.workspace.id },
      inviteResult.viewerAccess.id,
      repositories,
    );

    await expect(
      getViewerDashboard(
        { workspaceId: ctx.workspace.id },
        inviteResult.viewerAccess.id,
        10,
        2026,
        repositories,
      ),
    ).rejects.toThrow(ViewerAccessNotFoundError);
  });

  it("blocks access when viewer has no authorized contracts", async () => {
    const repositories = getRepositories();
    const inviteResult = await inviteViewer(
      { workspaceId: ctx.workspace.id },
      "nocontracts@example.com",
      ctx.user.id,
      new Date(),
      repositories,
    );

    await activateViewer(
      inviteResult.token.token,
      ctx.user.id,
      new Date(),
      repositories,
    );

    await expect(
      getViewerDashboard(
        { workspaceId: ctx.workspace.id },
        inviteResult.viewerAccess.id,
        10,
        2026,
        repositories,
      ),
    ).rejects.toThrow(ViewerUnauthorizedError);
  });

  it("filters entries after contract revocation", async () => {
    const repositories = getRepositories();
    const inviteResult = await inviteViewer(
      { workspaceId: ctx.workspace.id },
      "revoke-contract@example.com",
      ctx.user.id,
      new Date(),
      repositories,
    );

    await activateViewer(
      inviteResult.token.token,
      ctx.user.id,
      new Date(),
      repositories,
    );

    await authorizeContract(
      { workspaceId: ctx.workspace.id },
      {
        viewerAccessId: inviteResult.viewerAccess.id,
        contractId: ctx.contract.id,
        displayLabel: "Contract",
      },
      ctx.user.id,
      new Date(),
      repositories,
    );

    await createTimeEntry(
      { workspaceId: ctx.workspace.id },
      {
        contractId: ctx.contract.id,
        workDate: new Date(2026, 9, 1),
        durationMinutes: 120,
        billable: true,
        description: "Before revocation",
      },
      ctx.user.id,
      new Date(),
      repositories,
    );

    let dashboard = await getViewerDashboard(
      { workspaceId: ctx.workspace.id },
      inviteResult.viewerAccess.id,
      10,
      2026,
      repositories,
    );

    expect(dashboard.metrics.totalMinutes).toBe(120);

    await revokeContractAccess(
      { workspaceId: ctx.workspace.id },
      inviteResult.viewerAccess.id,
      ctx.contract.id,
      repositories,
    );

    await expect(
      getViewerDashboard(
        { workspaceId: ctx.workspace.id },
        inviteResult.viewerAccess.id,
        10,
        2026,
        repositories,
      ),
    ).rejects.toThrow(ViewerUnauthorizedError);
  });

  it("includes pending anomalies count in dashboard", async () => {
    const repositories = getRepositories();
    const inviteResult = await inviteViewer(
      { workspaceId: ctx.workspace.id },
      "anomalies@example.com",
      ctx.user.id,
      new Date(),
      repositories,
    );

    await activateViewer(
      inviteResult.token.token,
      ctx.user.id,
      new Date(),
      repositories,
    );

    await authorizeContract(
      { workspaceId: ctx.workspace.id },
      {
        viewerAccessId: inviteResult.viewerAccess.id,
        contractId: ctx.contract.id,
        displayLabel: "Contract",
      },
      ctx.user.id,
      new Date(),
      repositories,
    );

    await createAnomalyReport(
      { workspaceId: ctx.workspace.id },
      {
        viewerAccessId: inviteResult.viewerAccess.id,
        workDate: new Date(2026, 9, 1),
        message: "Issue 1",
      },
      repositories,
    );

    await createAnomalyReport(
      { workspaceId: ctx.workspace.id },
      {
        viewerAccessId: inviteResult.viewerAccess.id,
        workDate: new Date(2026, 9, 2),
        message: "Issue 2",
      },
      repositories,
    );

    const dashboard = await getViewerDashboard(
      { workspaceId: ctx.workspace.id },
      inviteResult.viewerAccess.id,
      10,
      2026,
      repositories,
    );

    expect(dashboard.anomalies.pendingCount).toBe(2);
  });

  it("isolates viewer data by workspace", async () => {
    const repositories = getRepositories();
    const otherWorkspaceId = "other-ws-id";

    const inviteResult = await inviteViewer(
      { workspaceId: ctx.workspace.id },
      "isolation@example.com",
      ctx.user.id,
      new Date(),
      repositories,
    );

    await activateViewer(
      inviteResult.token.token,
      ctx.user.id,
      new Date(),
      repositories,
    );

    await authorizeContract(
      { workspaceId: ctx.workspace.id },
      {
        viewerAccessId: inviteResult.viewerAccess.id,
        contractId: ctx.contract.id,
        displayLabel: "Contract",
      },
      ctx.user.id,
      new Date(),
      repositories,
    );

    await expect(
      getViewerDashboard(
        { workspaceId: otherWorkspaceId },
        inviteResult.viewerAccess.id,
        10,
        2026,
        repositories,
      ),
    ).rejects.toThrow();
  });
});
