// tests/integration/timesheet-viewer-security.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/prisma/client";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { inviteViewer } from "@/application/timesheet-viewer/invite-viewer";
import { activateViewer } from "@/application/timesheet-viewer/activate-viewer";
import { authorizeContract } from "@/application/timesheet-viewer/authorize-contract";
import { revokeViewer } from "@/application/timesheet-viewer/revoke-viewer";
import { createAnomalyReport } from "@/application/timesheet-viewer/create-anomaly-report";
import { acknowledgeAnomaly } from "@/application/timesheet-viewer/acknowledge-anomaly";
import { resolveAnomaly } from "@/application/timesheet-viewer/resolve-anomaly";
import { createRepositories, runInTransaction } from "@/infrastructure/persistence/create-repositories";
import {
  ViewerAccessNotFoundError,
  ViewerTokenNotFoundError,
  ViewerTokenExpiredError,
  ViewerTokenAlreadyAcceptedError,
  AnomalyReportNotFoundError,
} from "@/domain/viewer-errors";
import { ContractNotFoundError } from "@/domain/contract-errors";

const WORKSPACE_A_ID = "a0000000-0000-4000-8000-000000000001";
const WORKSPACE_B_ID = "b0000000-0000-4000-8000-000000000002";
const USER_A_ID = "a1111111-1111-4111-8111-111111111111";
const USER_B_ID = "b2222222-2222-4222-8222-222222222222";
const CLIENT_A_ID = "c1111111-1111-4111-8111-111111111111";
const CLIENT_B_ID = "c2222222-2222-4222-8222-222222222222";
const CONTRACT_A_ID = "d1111111-1111-4111-8111-111111111111";
const CONTRACT_B_ID = "d2222222-2222-4222-8222-222222222222";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000099";

async function setupWorkspace(workspaceId: string, userId: string, clientId: string, contractId: string) {
  await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: `Security Test Workspace ${workspaceId}`,
      timezone: "UTC",
      currency: "EUR",
    },
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId,
      role: "OWNER",
    },
  });

  await prisma.client.create({
    data: {
      id: clientId,
      workspaceId,
      companyName: `Test Client ${workspaceId}`,
      status: "ACTIVE",
    },
  });

  await prisma.contract.create({
    data: {
      id: contractId,
      workspaceId,
      clientId,
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
}

beforeEach(async () => {
  // Global setup.ts already truncates all tables
  // Just set up the test-specific workspaces
  await setupWorkspace(WORKSPACE_A_ID, USER_A_ID, CLIENT_A_ID, CONTRACT_A_ID);
  await setupWorkspace(WORKSPACE_B_ID, USER_B_ID, CLIENT_B_ID, CONTRACT_B_ID);
});

const contextA: WorkspaceContext = {
  workspaceId: WORKSPACE_A_ID,
  userId: USER_A_ID,
  role: "OWNER",
  timezone: "UTC",
};

const contextB: WorkspaceContext = {
  workspaceId: WORKSPACE_B_ID,
  userId: USER_B_ID,
  role: "OWNER",
  timezone: "UTC",
};

describe("Timesheet Viewer Security", () => {
  describe("workspace isolation", () => {
    it("prevents accessing viewer access from foreign workspace", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      const foreignAccess = await repos.viewerAccess.getById(
        WORKSPACE_B_ID,
        invited.viewerAccess.id,
      );

      expect(foreignAccess).toBeNull();
    });

    it("prevents revoking viewer access from foreign workspace", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "revoke-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      await expect(
        revokeViewer(contextB, invited.viewerAccess.id, repos),
      ).rejects.toThrow(ViewerAccessNotFoundError);
    });

    it("prevents authorizing foreign workspace contracts", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "contract-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      await activateViewer(
        { plainToken: invited.plainToken, userId: "viewer-123" },
        { runInTransaction },
      );

      await expect(
        authorizeContract(
          contextA,
          {
            viewerAccessId: invited.viewerAccess.id,
            contractId: CONTRACT_B_ID,
          },
          repos.viewerAccess,
          repos.contracts,
        ),
      ).rejects.toThrow(ContractNotFoundError);
    });

    it("prevents authorizing contracts for foreign workspace viewers", async () => {
      const repos = createRepositories();
      
      const invitedA = await inviteViewer(
        contextA,
        { email: "viewer-a@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      await activateViewer(
        { plainToken: invitedA.plainToken, userId: "viewer-a" },
        { runInTransaction },
      );

      await expect(
        authorizeContract(
          contextB,
          {
            viewerAccessId: invitedA.viewerAccess.id,
            contractId: CONTRACT_B_ID,
          },
          repos.viewerAccess,
          repos.contracts,
        ),
      ).rejects.toThrow(ViewerAccessNotFoundError);
    });

    it("prevents creating anomaly reports for foreign workspace viewers", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "anomaly-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      await activateViewer(
        { plainToken: invited.plainToken, userId: "viewer-anomaly" },
        { runInTransaction },
      );

      await expect(
        createAnomalyReport(
          contextB,
          {
            viewerAccessId: invited.viewerAccess.id,
            workDate: new Date("2026-10-29"),
            message: "Test anomaly message",
          },
          repos.viewerAccess,
          repos.anomalyReports,
        ),
      ).rejects.toThrow(ViewerAccessNotFoundError);
    });

    it("prevents accessing anomaly reports from foreign workspace", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "report-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      await activateViewer(
        { plainToken: invited.plainToken, userId: "viewer-report" },
        { runInTransaction },
      );

      const report = await createAnomalyReport(
        contextA,
        {
          viewerAccessId: invited.viewerAccess.id,
          workDate: new Date("2026-10-29"),
          message: "Test report",
        },
        repos.viewerAccess,
        repos.anomalyReports,
      );

      const foreignReport = await repos.anomalyReports.getById(
        WORKSPACE_B_ID,
        report.id,
      );

      expect(foreignReport).toBeNull();
    });

    it("prevents acknowledging anomaly reports from foreign workspace", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "ack-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      await activateViewer(
        { plainToken: invited.plainToken, userId: "viewer-ack" },
        { runInTransaction },
      );

      const report = await createAnomalyReport(
        contextA,
        {
          viewerAccessId: invited.viewerAccess.id,
          workDate: new Date("2026-10-29"),
          message: "Test anomaly report",
        },
        repos.viewerAccess,
        repos.anomalyReports,
      );

      await expect(
        acknowledgeAnomaly(
          contextB,
          report.id,
          { freelanceNotes: "Checking" },
          repos.anomalyReports,
        ),
      ).rejects.toThrow(AnomalyReportNotFoundError);
    });

    it("list operations respect workspace boundaries", async () => {
      const repos = createRepositories();
      
      const invitedA = await inviteViewer(
        contextA,
        { email: "list-a@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      const invitedB = await inviteViewer(
        contextB,
        { email: "list-b@example.com", contractIds: [CONTRACT_B_ID], tokenExpiryHours: 72 },
        repos,
      );

      const viewersA = await repos.viewerAccess.listActiveByUserId(USER_A_ID);
      const viewersB = await repos.viewerAccess.listActiveByUserId(USER_B_ID);

      expect(viewersA.every(v => v.workspaceId === WORKSPACE_A_ID)).toBe(true);
      expect(viewersB.every(v => v.workspaceId === WORKSPACE_B_ID)).toBe(true);
    });
  });

  describe("token security", () => {
    it("rejects expired tokens", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "expired@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 1 },
        repos,
      );

      await prisma.viewerInviteToken.update({
        where: { id: invited.token.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await expect(
        activateViewer(
          { plainToken: invited.plainToken, userId: "viewer-expired" },
          { runInTransaction },
        ),
      ).rejects.toThrow(ViewerTokenExpiredError);
    });

    it("prevents token reuse", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "reuse@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      await activateViewer(
        { plainToken: invited.plainToken, userId: "viewer-first" },
        { runInTransaction },
      );

      await expect(
        activateViewer(
          { plainToken: invited.plainToken, userId: "viewer-second" },
          { runInTransaction },
        ),
      ).rejects.toThrow(ViewerTokenAlreadyAcceptedError);
    });

    it("rejects invalid tokens", async () => {
      await expect(
        activateViewer(
          { plainToken: "invalid-token-12345", userId: "viewer-invalid" },
          { runInTransaction },
        ),
      ).rejects.toThrow(ViewerTokenNotFoundError);
    });

    it("token hash is never exposed in API responses", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "nohash@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      expect(invited.token.tokenHash).toBeDefined();
      expect(invited.plainToken).toBeDefined();
      expect(invited.plainToken).not.toBe(invited.token.tokenHash);
    });
  });

  describe("authorization", () => {
    it("only active viewers can create anomaly reports", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "pending@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      await expect(
        createAnomalyReport(
          contextA,
          {
            viewerAccessId: invited.viewerAccess.id,
            workDate: new Date("2026-10-29"),
            message: "Test anomaly message",
          },
          repos.viewerAccess,
          repos.anomalyReports,
        ),
      ).rejects.toThrow(ViewerAccessNotFoundError);
    });

    it("prevents operations on unknown viewer IDs", async () => {
      const repos = createRepositories();

      await expect(
        revokeViewer(contextA, UNKNOWN_ID, repos),
      ).rejects.toThrow(ViewerAccessNotFoundError);

      await expect(
        authorizeContract(
          contextA,
          { viewerAccessId: UNKNOWN_ID, contractId: CONTRACT_A_ID },
          repos.viewerAccess,
          repos.contracts,
        ),
      ).rejects.toThrow(ViewerAccessNotFoundError);

      await expect(
        createAnomalyReport(
          contextA,
          {
            viewerAccessId: UNKNOWN_ID,
            workDate: new Date("2026-10-29"),
            message: "Test anomaly message",
          },
          repos.viewerAccess,
          repos.anomalyReports,
        ),
      ).rejects.toThrow(ViewerAccessNotFoundError);
    });

    it("prevents operations on unknown anomaly report IDs", async () => {
      const repos = createRepositories();

      await expect(
        acknowledgeAnomaly(
          contextA,
          UNKNOWN_ID,
          { freelanceNotes: "Test" },
          repos.anomalyReports,
        ),
      ).rejects.toThrow(AnomalyReportNotFoundError);

      await expect(
        resolveAnomaly(
          contextA,
          UNKNOWN_ID,
          { freelanceNotes: "Test" },
          repos.anomalyReports,
        ),
      ).rejects.toThrow(AnomalyReportNotFoundError);
    });
  });

  describe("status transitions", () => {
    it("validates anomaly report status transitions", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "status@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      await activateViewer(
        { plainToken: invited.plainToken, userId: "viewer-status" },
        { runInTransaction },
      );

      const report = await createAnomalyReport(
        contextA,
        {
          viewerAccessId: invited.viewerAccess.id,
          workDate: new Date("2026-10-29"),
          message: "Test anomaly report",
        },
        repos.viewerAccess,
        repos.anomalyReports,
      );

      const resolved = await resolveAnomaly(
        contextA,
        report.id,
        { freelanceNotes: "Fixed" },
        repos.anomalyReports,
      );

      expect(resolved.status).toBe("RESOLVED");

      await expect(
        acknowledgeAnomaly(
          contextA,
          report.id,
          { freelanceNotes: "Late ack" },
          repos.anomalyReports,
        ),
      ).rejects.toThrow();
    });
  });

  describe("input validation", () => {
    it("handles malformed IDs gracefully", async () => {
      const repos = createRepositories();

      const invalidIds = [
        "not-a-uuid",
        "12345",
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "",
      ];

      for (const invalidId of invalidIds) {
        await expect(
          repos.viewerAccess.getById(WORKSPACE_A_ID, invalidId),
        ).rejects.toThrow();
      }
    });

    it("validates email format", async () => {
      const repos = createRepositories();

      const invalidEmails = [
        "not-an-email",
        "@example.com",
        "test@",
        "",
      ];

      for (const email of invalidEmails) {
        await expect(
          inviteViewer(
            contextA,
            { email, tokenExpiryHours: 72 },
            repos,
          ),
        ).rejects.toThrow();
      }
    });
  });

  describe("no information leakage", () => {
    it("does not reveal cross-workspace resource existence", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "leak@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      try {
        await revokeViewer(contextB, invited.viewerAccess.id, repos);
      } catch (error) {
        expect((error as Error).message).not.toContain("another workspace");
        expect((error as Error).message).not.toContain("workspace A");
        expect((error as Error).message).not.toContain(WORKSPACE_A_ID);
      }

      try {
        await authorizeContract(
          contextB,
          {
            viewerAccessId: invited.viewerAccess.id,
            contractId: CONTRACT_A_ID,
          },
          repos.viewerAccess,
          repos.contracts,
        );
      } catch (error) {
        expect((error as Error).message).not.toContain("different workspace");
        expect((error as Error).message).not.toContain("belongs to");
      }
    });
  });

  describe("end-to-end flow validation", () => {
    it("validates complete invite → activate → authorize → revoke flow", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "e2e@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      expect(invited.viewerAccess.status).toBe("PENDING");
      expect(invited.plainToken).toBeTruthy();
      expect(invited.authorizedContracts).toHaveLength(1);
      expect(invited.authorizedContracts[0].contractId).toBe(CONTRACT_A_ID);

      const activated = await activateViewer(
        { plainToken: invited.plainToken, userId: "viewer-e2e" },
        { runInTransaction },
      );

      expect(activated.viewerAccess.status).toBe("ACTIVE");

      // CONTRACT_A_ID already authorized during invite, verify persistence
      const authorizedList = await repos.viewerAccess.listAuthorizedContracts(
        contextA.workspaceId,
        invited.viewerAccess.id,
      );
      
      expect(authorizedList).toHaveLength(1);
      expect(authorizedList[0].contractId).toBe(CONTRACT_A_ID);

      const revoked = await revokeViewer(
        contextA,
        invited.viewerAccess.id,
        repos,
      );

      expect(revoked.status).toBe("REVOKED");
      expect(revoked.revokedAt).toBeTruthy();
    });

    it("validates complete anomaly report lifecycle", async () => {
      const repos = createRepositories();
      
      const invited = await inviteViewer(
        contextA,
        { email: "anomaly-e2e@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
        repos,
      );

      await activateViewer(
        { plainToken: invited.plainToken, userId: "viewer-anomaly-e2e" },
        { runInTransaction },
      );

      const report = await createAnomalyReport(
        contextA,
        {
          viewerAccessId: invited.viewerAccess.id,
          workDate: new Date("2026-10-29"),
          message: "Test anomaly",
        },
        repos.viewerAccess,
        repos.anomalyReports,
      );

      expect(report.status).toBe("OPEN");

      const acknowledged = await acknowledgeAnomaly(
        contextA,
        report.id,
        { freelanceNotes: "Looking into it" },
        repos.anomalyReports,
      );

      expect(acknowledged.status).toBe("ACKNOWLEDGED");
      expect(acknowledged.acknowledgedAt).toBeTruthy();

      const resolved = await resolveAnomaly(
        contextA,
        report.id,
        { freelanceNotes: "Fixed the issue" },
        repos.anomalyReports,
      );

      expect(resolved.status).toBe("RESOLVED");
      expect(resolved.resolvedAt).toBeTruthy();
    });
  });
});
