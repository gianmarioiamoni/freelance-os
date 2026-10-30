// tests/integration/timesheet-viewer/viewer-lifecycle.test.ts
import { beforeEach, describe, expect, it } from "vitest";

import { activateViewer } from "@/application/timesheet-viewer/activate-viewer";
import { authorizeContract } from "@/application/timesheet-viewer/authorize-contract";
import { createAnomalyReport } from "@/application/timesheet-viewer/create-anomaly-report";
import { inviteViewer } from "@/application/timesheet-viewer/invite-viewer";
import { revokeContractAccess } from "@/application/timesheet-viewer/revoke-contract-access";
import { revokeViewer } from "@/application/timesheet-viewer/revoke-viewer";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import {
  createRepositories,
  runInTransaction,
} from "@/infrastructure/persistence/create-repositories";
import { prisma } from "@/infrastructure/prisma/client";
import { ViewerTokenExpiredError } from "@/domain/viewer-errors";

const TEST_WORKSPACE_ID = "550e8400-e29b-41d4-a716-446655440000";
const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const TEST_CLIENT_ID = "550e8400-e29b-41d4-a716-446655440010";
const TEST_CONTRACT_ID = "550e8400-e29b-41d4-a716-446655440011";

const context: WorkspaceContext = {
  workspaceId: TEST_WORKSPACE_ID,
  userId: TEST_USER_ID,
  role: "OWNER",
  timezone: "UTC",
};

beforeEach(async () => {
  // Global setup.ts already truncates all tables
  // Just set up the test-specific workspace and data
  await prisma.workspace.create({
    data: {
      id: TEST_WORKSPACE_ID,
      name: "Test Workspace",
      timezone: "UTC",
      currency: "EUR",
    },
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      role: "OWNER",
    },
  });

  await prisma.client.create({
    data: {
      id: TEST_CLIENT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      companyName: "Test Client",
      status: "ACTIVE",
    },
  });

  await prisma.contract.create({
    data: {
      id: TEST_CONTRACT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      clientId: TEST_CLIENT_ID,
      validFrom: new Date("2026-01-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "50.00",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: 0,
      allocatedMinutes: null,
      paymentTermsDays: null,
      paymentTermsNote: null,
    },
  });
});

describe("Viewer Lifecycle Integration", () => {
  it("completes full invite-activate-authorize-revoke flow", async () => {
    const repositories = createRepositories(prisma);

    // 1. Invite viewer
    const inviteResult = await inviteViewer(
      context,
      { email: "viewer@example.com", contractIds: [TEST_CONTRACT_ID], tokenExpiryHours: 72 },
      repositories,
    );

    expect(inviteResult.viewerAccess.email).toBe("viewer@example.com");
    expect(inviteResult.viewerAccess.status).toBe("PENDING");
    expect(inviteResult.plainToken).toBeTruthy();

    // 2. Activate viewer with token
    const activateResult = await activateViewer(
      { plainToken: inviteResult.plainToken, userId: "viewer-user-123" },
      { runInTransaction },
    );

    expect(activateResult.viewerAccess.status).toBe("ACTIVE");
    expect(activateResult.viewerAccess.userId).toBe("viewer-user-123");
    expect(activateResult.token.acceptedAt).toBeTruthy();

    // Authorized contracts already exist from invite; list them
    const authorizedContracts =
      await repositories.viewerAccess.listAuthorizedContracts(
        TEST_WORKSPACE_ID,
        inviteResult.viewerAccess.id,
      );
    expect(authorizedContracts).toHaveLength(1);
    expect(authorizedContracts[0].contractId).toBe(TEST_CONTRACT_ID);

    // Revoke contract access
    await revokeContractAccess(
      context,
      inviteResult.viewerAccess.id,
      TEST_CONTRACT_ID,
      repositories.viewerAccess,
    );

    const afterRevoke = await repositories.viewerAccess.listAuthorizedContracts(
      TEST_WORKSPACE_ID,
      inviteResult.viewerAccess.id,
    );
    expect(afterRevoke).toHaveLength(0);

    // Revoke viewer access
    const revokedViewer = await revokeViewer(
      context,
      inviteResult.viewerAccess.id,
      repositories,
    );

    expect(revokedViewer.status).toBe("REVOKED");
    expect(revokedViewer.revokedAt).toBeTruthy();
  });

  it("rejects activation with expired token", async () => {
    const repositories = createRepositories(prisma);

    // Create viewer with valid token
    const inviteResult = await inviteViewer(
      context,
      { email: "expired@example.com", contractIds: [TEST_CONTRACT_ID], tokenExpiryHours: 1 },
      repositories,
    );

    // Manually expire the token
    await prisma.viewerInviteToken.update({
      where: { id: inviteResult.token.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(
      activateViewer(
        { plainToken: inviteResult.plainToken, userId: "viewer-user-456" },
        { runInTransaction },
      ),
    ).rejects.toThrow(ViewerTokenExpiredError);
  });

  it("creates and manages anomaly reports", async () => {
    const repositories = createRepositories(prisma);

    // Setup active viewer
    const inviteResult = await inviteViewer(
      context,
      { email: "reporter@example.com", contractIds: [TEST_CONTRACT_ID], tokenExpiryHours: 72 },
      repositories,
    );

    await activateViewer(
      { plainToken: inviteResult.plainToken, userId: "viewer-user-789" },
      { runInTransaction },
    );

    // Create anomaly report
    const report = await createAnomalyReport(
      context,
      {
        viewerAccessId: inviteResult.viewerAccess.id,
        workDate: new Date("2026-10-29"),
        message: "Time entry on this date appears incorrect",
      },
      repositories.viewerAccess,
      repositories.anomalyReports,
    );

    expect(report.status).toBe("OPEN");
    expect(report.message).toBe("Time entry on this date appears incorrect");

    // List reports for viewer
    const reports = await repositories.anomalyReports.listForViewerAccess(
      TEST_WORKSPACE_ID,
      inviteResult.viewerAccess.id,
      "OPEN",
    );

    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe(report.id);
  });
});
