// tests/integration/viewer-portal-time-entry-anomalies.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/prisma/client";
import {
  createRepositories,
  runInTransaction,
} from "@/infrastructure/persistence/create-repositories";
import { inviteViewer } from "@/application/timesheet-viewer/invite-viewer";
import { activateViewer } from "@/application/timesheet-viewer/activate-viewer";
import { authorizeContract } from "@/application/timesheet-viewer/authorize-contract";
import { reportTimeEntryAnomaly } from "@/application/timesheet-viewer/report-time-entry-anomaly";
import { getViewerTimeEntries } from "@/application/timesheet-viewer/get-viewer-time-entries";
import {
  ViewerAccessNotFoundError,
  ViewerUnauthorizedError,
} from "@/domain/viewer-errors";

describe("Viewer Portal Time Entry Anomalies", () => {
  let workspaceId: string;
  let ownerId: string;
  let viewerId: string;
  let contractId: string;
  let timeEntryId: string;

  beforeEach(async () => {
    // Create owner
    const owner = await prisma.user.create({
      data: {
        id: `owner-${Date.now()}`,
        name: "Test Owner",
        email: `owner-${Date.now()}@example.com`,
        emailVerified: true,
      },
    });
    ownerId = owner.id;

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: "Test Workspace",
        timezone: "Europe/Rome",
        currency: "EUR",
      },
    });
    workspaceId = workspace.id;

    // Add owner membership
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: ownerId,
        role: "OWNER",
      },
    });

    // Create client
    const client = await prisma.client.create({
      data: {
        workspaceId,
        companyName: "Test Client",
        status: "ACTIVE",
      },
    });

    // Create contract
    const contract = await prisma.contract.create({
      data: {
        workspaceId,
        clientId: client.id,
        reference: "TEST-001",
        billingModel: "HOURLY",
        rate: "100.00",
        currency: "EUR",
        validFrom: new Date("2024-01-01"),
        commitmentMode: "PERCENTAGE",
        commitmentPercentage: 0,
      },
    });
    contractId = contract.id;

    // Create time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        workspaceId,
        userId: ownerId,
        clientId: client.id,
        contractId: contract.id,
        workDate: new Date("2024-01-15"),
        durationMinutes: 480,
        description: "Test work",
        billable: true,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "100.00",
        snapshotCurrency: "EUR",
      },
    });
    timeEntryId = timeEntry.id;

    // Create viewer user
    const viewer = await prisma.user.create({
      data: {
        id: `viewer-${Date.now()}`,
        name: "Test Viewer",
        email: `viewer-${Date.now()}@example.com`,
        emailVerified: true,
      },
    });
    viewerId = viewer.id;
  });

  afterEach(async () => {
    await prisma.anomalyReport.deleteMany({ where: { workspaceId } });
    await prisma.timesheetViewerContract.deleteMany({ where: { workspaceId } });
    await prisma.timesheetViewerAccess.deleteMany({ where: { workspaceId } });
    await prisma.viewerInviteToken.deleteMany({ where: { workspaceId } });
    await prisma.timeEntry.deleteMany({ where: { workspaceId } });
    await prisma.contract.deleteMany({ where: { workspaceId } });
    await prisma.client.deleteMany({ where: { workspaceId } });
    await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
    await prisma.workspace.delete({ where: { id: workspaceId } });
    
    const userIdsToDelete = [ownerId, viewerId].filter(id => id !== undefined);
    if (userIdsToDelete.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIdsToDelete } },
      });
    }
  });

  it("allows active viewer to report anomaly for authorized time entry", async () => {
    const repos = createRepositories();

    // Invite and activate viewer
    const invite = await inviteViewer(
      { workspaceId, userId: ownerId, role: "OWNER", timezone: "UTC" },
      {
        email: (await prisma.user.findUnique({ where: { id: viewerId } }))!
          .email,
        contractIds: [contractId],
      },
      repos,
    );

    await activateViewer(
      {
        plainToken: invite.plainToken,
        userId: viewerId,
      },
      {
        runInTransaction,
      },
    );

    const viewerAccess = await repos.viewerAccess.getActiveAccess(
      workspaceId,
      viewerId,
    );

    expect(viewerAccess).toBeTruthy();
    expect(viewerAccess?.status).toBe("ACTIVE");

    // Report anomaly
    const anomalyReport = await reportTimeEntryAnomaly(
      { workspaceId, userId: viewerId, role: "VIEWER", timezone: "UTC" },
      {
        viewerAccessId: viewerAccess!.id,
        timeEntryId,
        message: "This entry seems incorrect for this date",
      },
      {
        viewerAccess: repos.viewerAccess,
        timeEntries: repos.timeEntries,
        contracts: repos.contracts,
        anomalyReports: repos.anomalyReports,
        workspaceMembers: repos.members,
        workspaces: repos.workspaces,
      },
    );

    expect(anomalyReport).toBeTruthy();
    expect(anomalyReport.status).toBe("OPEN");
    expect(anomalyReport.timeEntryId).toBe(timeEntryId);
    expect(anomalyReport.message).toBe("This entry seems incorrect for this date");

    // Verify it's persisted
    const persisted = await repos.anomalyReports.getById(
      workspaceId,
      anomalyReport.id,
    );
    expect(persisted).toBeTruthy();
    expect(persisted?.status).toBe("OPEN");
  });

  it("prevents non-active viewer from reporting anomalies", async () => {
    const repos = createRepositories();

    // Create pending viewer access
    const pendingViewer = await prisma.timesheetViewerAccess.create({
      data: {
        workspaceId,
        email: "pending@example.com",
        status: "PENDING",
      },
    });

    await expect(
      reportTimeEntryAnomaly(
        { workspaceId, userId: viewerId, role: "VIEWER", timezone: "UTC" },
        {
          viewerAccessId: pendingViewer.id,
          timeEntryId,
          message: "This should fail",
        },
        {
          viewerAccess: repos.viewerAccess,
          timeEntries: repos.timeEntries,
          contracts: repos.contracts,
          anomalyReports: repos.anomalyReports,
          workspaceMembers: repos.members,
          workspaces: repos.workspaces,
        },
      ),
    ).rejects.toThrow(ViewerAccessNotFoundError);
  });

  it("prevents viewer from reporting anomaly for unauthorized contract", async () => {
    const repos = createRepositories();

    // Create second contract
    const client2 = await prisma.client.create({
      data: {
        workspaceId,
        companyName: "Client 2",
        status: "ACTIVE",
      },
    });

    const contract2 = await prisma.contract.create({
      data: {
        workspaceId,
        clientId: client2.id,
        reference: "UNAUTH-001",
        billingModel: "HOURLY",
        rate: "100.00",
        currency: "EUR",
        validFrom: new Date("2024-01-01"),
        commitmentMode: "PERCENTAGE",
        commitmentPercentage: 0,
      },
    });

    const unauthorizedEntry = await prisma.timeEntry.create({
      data: {
        workspaceId,
        userId: ownerId,
        clientId: client2.id,
        contractId: contract2.id,
        workDate: new Date("2024-01-15"),
        durationMinutes: 480,
        description: "Unauthorized work",
        billable: true,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "100.00",
        snapshotCurrency: "EUR",
      },
    });

    // Invite and activate viewer for first contract only
    const invite = await inviteViewer(
      { workspaceId, userId: ownerId, role: "OWNER", timezone: "UTC" },
      {
        email: (await prisma.user.findUnique({ where: { id: viewerId } }))!
          .email,
        contractIds: [contractId], // Only first contract
      },
      repos,
    );

    await activateViewer(
      {
        plainToken: invite.plainToken,
        userId: viewerId,
      },
      {
        runInTransaction,
      },
    );

    const viewerAccess = await repos.viewerAccess.getActiveAccess(
      workspaceId,
      viewerId,
    );

    // Try to report anomaly for unauthorized entry
    await expect(
      reportTimeEntryAnomaly(
        { workspaceId, userId: viewerId, role: "VIEWER", timezone: "UTC" },
        {
          viewerAccessId: viewerAccess!.id,
          timeEntryId: unauthorizedEntry.id,
          message: "Should not be allowed",
        },
        {
          viewerAccess: repos.viewerAccess,
          timeEntries: repos.timeEntries,
          contracts: repos.contracts,
          anomalyReports: repos.anomalyReports,
          workspaceMembers: repos.members,
          workspaces: repos.workspaces,
        },
      ),
    ).rejects.toThrow(ViewerUnauthorizedError);
  });

  it("viewer can retrieve time entries for authorized contracts", async () => {
    const repos = createRepositories();

    // Invite and activate viewer
    const invite = await inviteViewer(
      { workspaceId, userId: ownerId, role: "OWNER", timezone: "UTC" },
      {
        email: (await prisma.user.findUnique({ where: { id: viewerId } }))!
          .email,
        contractIds: [contractId],
      },
      repos,
    );

    await activateViewer(
      {
        plainToken: invite.plainToken,
        userId: viewerId,
      },
      {
        runInTransaction,
      },
    );

    const viewerAccess = await repos.viewerAccess.getActiveAccess(
      workspaceId,
      viewerId,
    );

    // Get time entries
    const entries = await getViewerTimeEntries(
      workspaceId,
      viewerAccess!.id,
      1, // January
      2024,
      {
        viewerAccess: repos.viewerAccess,
        timeEntries: repos.timeEntries,
        contracts: repos.contracts,
      },
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(timeEntryId);
    expect(entries[0].engagement).toBe("TEST-001");
    expect(entries[0].description).toBe("Test work");
  });

  it("anomaly report is persisted even if email fails", async () => {
    const repos = createRepositories();

    // Invite and activate viewer
    const invite = await inviteViewer(
      { workspaceId, userId: ownerId, role: "OWNER", timezone: "UTC" },
      {
        email: (await prisma.user.findUnique({ where: { id: viewerId } }))!
          .email,
        contractIds: [contractId],
      },
      repos,
    );

    await activateViewer(
      {
        plainToken: invite.plainToken,
        userId: viewerId,
      },
      {
        runInTransaction,
      },
    );

    const viewerAccess = await repos.viewerAccess.getActiveAccess(
      workspaceId,
      viewerId,
    );

    // Report anomaly (email will fail in test environment but anomaly should persist)
    const anomalyReport = await reportTimeEntryAnomaly(
      { workspaceId, userId: viewerId, role: "VIEWER", timezone: "UTC" },
      {
        viewerAccessId: viewerAccess!.id,
        timeEntryId,
        message: "Test anomaly - email may fail but report persists",
      },
      {
        viewerAccess: repos.viewerAccess,
        timeEntries: repos.timeEntries,
        contracts: repos.contracts,
        anomalyReports: repos.anomalyReports,
        workspaceMembers: repos.members,
        workspaces: repos.workspaces,
      },
    );

    // Verify anomaly was persisted despite potential email failure
    const allAnomalies = await repos.anomalyReports.listForWorkspace(
      workspaceId,
    );
    expect(allAnomalies).toHaveLength(1);
    expect(allAnomalies[0].id).toBe(anomalyReport.id);
    expect(allAnomalies[0].status).toBe("OPEN");
  });
});
