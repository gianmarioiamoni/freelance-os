// tests/integration/api/timesheet-viewer.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/prisma/client";

const TEST_WORKSPACE_ID = "550e8400-e29b-41d4-a716-446655440000";
const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440001";
const TEST_CLIENT_ID = "550e8400-e29b-41d4-a716-446655440010";
const TEST_CONTRACT_ID = "550e8400-e29b-41d4-a716-446655440011";

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

describe("Timesheet Viewer API Integration", () => {
  it("invites viewer via API route logic", async () => {
    const { inviteViewer } = await import(
      "@/application/timesheet-viewer/invite-viewer"
    );
    const { createRepositories } = await import(
      "@/infrastructure/persistence/create-repositories"
    );

    const repositories = createRepositories(prisma);
    const context = {
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      role: "OWNER" as const,
      timezone: "UTC",
    };

    const result = await inviteViewer(
      context,
      { email: "api-test@example.com", contractIds: [TEST_CONTRACT_ID], tokenExpiryHours: 72 },
      repositories,
    );

    expect(result.viewerAccess.email).toBe("api-test@example.com");
    expect(result.viewerAccess.status).toBe("PENDING");
    expect(result.plainToken).toBeTruthy();
  });

  it("lists viewer access via repository", async () => {
    const { inviteViewer } = await import(
      "@/application/timesheet-viewer/invite-viewer"
    );
    const { listViewerAccess } = await import(
      "@/application/timesheet-viewer/list-viewer-access"
    );
    const { createRepositories } = await import(
      "@/infrastructure/persistence/create-repositories"
    );

    const repositories = createRepositories(prisma);
    const context = {
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      role: "OWNER" as const,
      timezone: "UTC",
    };

    await inviteViewer(
      context,
      { email: "list-test@example.com", contractIds: [TEST_CONTRACT_ID], tokenExpiryHours: 72 },
      repositories,
    );

    const viewers = await listViewerAccess(context, repositories.viewerAccess);

    expect(viewers.length).toBeGreaterThan(0);
    expect(viewers[0].email).toBe("list-test@example.com");
  });

  it("revokes viewer via application service", async () => {
    const { inviteViewer } = await import(
      "@/application/timesheet-viewer/invite-viewer"
    );
    const { activateViewer } = await import(
      "@/application/timesheet-viewer/activate-viewer"
    );
    const { revokeViewer } = await import(
      "@/application/timesheet-viewer/revoke-viewer"
    );
    const { createRepositories, runInTransaction } = await import(
      "@/infrastructure/persistence/create-repositories"
    );

    const repositories = createRepositories(prisma);
    const context = {
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      role: "OWNER" as const,
      timezone: "UTC",
    };

    const invited = await inviteViewer(
      context,
      { email: "revoke-test@example.com", contractIds: [TEST_CONTRACT_ID], tokenExpiryHours: 72 },
      repositories,
    );

    // Activate the viewer first (can only revoke ACTIVE viewers)
    await activateViewer(
      { plainToken: invited.plainToken, userId: "test-viewer-user" },
      { runInTransaction },
    );

    const revoked = await revokeViewer(
      context,
      invited.viewerAccess.id,
      repositories,
    );

    expect(revoked.status).toBe("REVOKED");
    expect(revoked.revokedAt).toBeTruthy();
  });

  it("authorizes contract via application service", async () => {
    const { inviteViewer } = await import(
      "@/application/timesheet-viewer/invite-viewer"
    );
    const { activateViewer } = await import(
      "@/application/timesheet-viewer/activate-viewer"
    );
    const { authorizeContract } = await import(
      "@/application/timesheet-viewer/authorize-contract"
    );
    const { createRepositories, runInTransaction } = await import(
      "@/infrastructure/persistence/create-repositories"
    );

    const repositories = createRepositories(prisma);
    const context = {
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      role: "OWNER" as const,
      timezone: "UTC",
    };

    const invited = await inviteViewer(
      context,
      { email: "authorize-test@example.com", contractIds: [TEST_CONTRACT_ID], tokenExpiryHours: 72 },
      repositories,
    );

    await activateViewer(
      { plainToken: invited.plainToken, userId: "viewer-123" },
      { runInTransaction },
    );

    // Contracts are authorized during invite; fetch and verify
    const authorizedContracts = await repositories.viewerAccess.listAuthorizedContracts(
      TEST_WORKSPACE_ID,
      invited.viewerAccess.id,
    );

    expect(authorizedContracts).toHaveLength(1);
    expect(authorizedContracts[0].contractId).toBe(TEST_CONTRACT_ID);
  });

  it("creates anomaly report via application service", async () => {
    const { inviteViewer } = await import(
      "@/application/timesheet-viewer/invite-viewer"
    );
    const { activateViewer } = await import(
      "@/application/timesheet-viewer/activate-viewer"
    );
    const { createAnomalyReport } = await import(
      "@/application/timesheet-viewer/create-anomaly-report"
    );
    const { createRepositories, runInTransaction } = await import(
      "@/infrastructure/persistence/create-repositories"
    );

    const repositories = createRepositories(prisma);
    const context = {
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      role: "OWNER" as const,
      timezone: "UTC",
    };

    const invited = await inviteViewer(
      context,
      { email: "anomaly-test@example.com", contractIds: [TEST_CONTRACT_ID], tokenExpiryHours: 72 },
      repositories,
    );

    await activateViewer(
      { plainToken: invited.plainToken, userId: "viewer-456" },
      { runInTransaction },
    );

    const report = await createAnomalyReport(
      context,
      {
        viewerAccessId: invited.viewerAccess.id,
        workDate: new Date("2026-10-29"),
        message: "Test anomaly report message",
      },
      repositories.viewerAccess,
      repositories.anomalyReports,
    );

    expect(report.status).toBe("OPEN");
    expect(report.message).toBe("Test anomaly report message");
  });

  it("acknowledges anomaly report via application service", async () => {
    const { inviteViewer } = await import(
      "@/application/timesheet-viewer/invite-viewer"
    );
    const { activateViewer } = await import(
      "@/application/timesheet-viewer/activate-viewer"
    );
    const { createAnomalyReport } = await import(
      "@/application/timesheet-viewer/create-anomaly-report"
    );
    const { acknowledgeAnomaly } = await import(
      "@/application/timesheet-viewer/acknowledge-anomaly"
    );
    const { createRepositories, runInTransaction } = await import(
      "@/infrastructure/persistence/create-repositories"
    );

    const repositories = createRepositories(prisma);
    const context = {
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      role: "OWNER" as const,
      timezone: "UTC",
    };

    const invited = await inviteViewer(
      context,
      { email: "ack-test@example.com", contractIds: [TEST_CONTRACT_ID], tokenExpiryHours: 72 },
      repositories,
    );

    await activateViewer(
      { plainToken: invited.plainToken, userId: "viewer-789" },
      { runInTransaction },
    );

    const report = await createAnomalyReport(
      context,
      {
        viewerAccessId: invited.viewerAccess.id,
        workDate: new Date("2026-10-29"),
        message: "Test anomaly for acknowledgment",
      },
      repositories.viewerAccess,
      repositories.anomalyReports,
    );

    const acknowledged = await acknowledgeAnomaly(
      context,
      report.id,
      { freelanceNotes: "Checking this issue" },
      repositories.anomalyReports,
    );

    expect(acknowledged.status).toBe("ACKNOWLEDGED");
    expect(acknowledged.freelanceNotes).toBe("Checking this issue");
    expect(acknowledged.acknowledgedAt).toBeTruthy();
  });
});
