// tests/integration/analytics/analytics-workspace-isolation.test.ts
import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { InvalidPersistenceStateError } from "@/domain/persistence-errors";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import { currentMonthDay } from "../current-month-dates";
import { createWorkspaceGraph } from "../persistence/fixtures";
import { repositories } from "../persistence/helpers";

describe("Analytics Workspace Isolation", () => {
  let workspaceA: Awaited<ReturnType<typeof createWorkspaceGraph>>;
  let workspaceB: Awaited<ReturnType<typeof createWorkspaceGraph>>;
  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    workspaceA = await createWorkspaceGraph(repositories, "Workspace A");
    workspaceB = await createWorkspaceGraph(repositories, "Workspace B");
    analyticsService = new AnalyticsService(
      repositories.analytics,
      repositories.members
    );
  });

  describe("Cross-workspace data leakage prevention", () => {
    it("prevents workspace A from seeing workspace B time entries", async () => {
      const workspaceAContext = {
        workspaceId: workspaceA.workspaceId,
        userId: workspaceA.userId,
        role: "OWNER" as const,
      };

      const workspaceBContext = {
        workspaceId: workspaceB.workspaceId,
        userId: workspaceB.userId,
        role: "OWNER" as const,
      };

      // Add time entries to workspace B only
      await repositories.timeEntries.recordTimeEntry(workspaceB.workspaceId, {
        userId: workspaceB.userId,
        clientId: workspaceB.clientId,
        contractId: workspaceB.contractId,
        workDate: currentMonthDay(15),
        durationMinutes: 480,
        description: "Workspace B work",
        billable: true,
      });

      // Workspace A analytics should be empty
      const analyticsA = await analyticsService.getCurrentMonthAnalytics(workspaceAContext);
      expect(analyticsA.totalMinutes).toBe(0);
      expect(analyticsA.clientAllocations).toHaveLength(0);
      expect(analyticsA.contractUtilizations).toHaveLength(0);

      // Workspace B analytics should show the time entry
      const analyticsB = await analyticsService.getCurrentMonthAnalytics(workspaceBContext);
      expect(analyticsB.totalMinutes).toBe(480);
      expect(analyticsB.clientAllocations).toHaveLength(1);
      expect(analyticsB.contractUtilizations).toHaveLength(1);
    });

    it("prevents workspace A from seeing workspace B clients in allocations", async () => {
      const workspaceAContext = {
        workspaceId: workspaceA.workspaceId,
        userId: workspaceA.userId,
        role: "OWNER" as const,
      };

      // Create a distinctly named client in workspace B
      const workspaceBClient = await repositories.clients.createClient(workspaceB.workspaceId, {
        companyName: "Foreign Corp (Should Not Appear)",
      });

      const workspaceBContract = await repositories.contracts.createContract(workspaceB.workspaceId, {
        clientId: workspaceBClient.id,
        billingModel: "HOURLY",
        rate: "100.0000",
        currency: "EUR",
        monthlyContractedMinutes: 4800,
        validFrom: currentMonthDay(1),
        validTo: null,
      });

      // Add time entry to workspace B foreign client
      await repositories.timeEntries.recordTimeEntry(workspaceB.workspaceId, {
        userId: workspaceB.userId,
        clientId: workspaceBClient.id,
        contractId: workspaceBContract.id,
        workDate: currentMonthDay(15),
        durationMinutes: 360,
        description: "Foreign client work",
        billable: true,
      });

      // Workspace A should not see foreign client
      const analyticsA = await analyticsService.getCurrentMonthAnalytics(workspaceAContext);
      const clientNames = analyticsA.clientAllocations.map(c => c.clientName);
      expect(clientNames).not.toContain("Foreign Corp (Should Not Appear)");
    });

    it("prevents workspace A from seeing workspace B contracts in utilization", async () => {
      const workspaceAContext = {
        workspaceId: workspaceA.workspaceId,
        userId: workspaceA.userId,
        role: "OWNER" as const,
      };

      // Create time entry in workspace B
      await repositories.timeEntries.recordTimeEntry(workspaceB.workspaceId, {
        userId: workspaceB.userId,
        clientId: workspaceB.clientId,
        contractId: workspaceB.contractId,
        workDate: currentMonthDay(15),
        durationMinutes: 480,
        description: "Workspace B contract work",
        billable: true,
      });

      // Workspace A should not see foreign contract utilization
      const analyticsA = await analyticsService.getCurrentMonthAnalytics(workspaceAContext);
      expect(analyticsA.contractUtilizations).toHaveLength(0);
    });

    it("enforces workspace isolation with identical client names", async () => {
      const workspaceAContext = {
        workspaceId: workspaceA.workspaceId,
        userId: workspaceA.userId,
        role: "OWNER" as const,
      };

      const workspaceBContext = {
        workspaceId: workspaceB.workspaceId,
        userId: workspaceB.userId,
        role: "OWNER" as const,
      };

      // Create clients with identical names in both workspaces
      const identicalName = "ACME Corp";
      
      // Update workspace A client name
      await repositories.clients.updateClient(workspaceA.workspaceId, workspaceA.clientId, {
        companyName: identicalName,
      });

      // Update workspace B client name
      await repositories.clients.updateClient(workspaceB.workspaceId, workspaceB.clientId, {
        companyName: identicalName,
      });

      // Add different amounts of time to each workspace
      await repositories.timeEntries.recordTimeEntry(workspaceA.workspaceId, {
        userId: workspaceA.userId,
        clientId: workspaceA.clientId,
        contractId: workspaceA.contractId,
        workDate: currentMonthDay(15),
        durationMinutes: 240, // 4 hours
        description: "Workspace A work",
        billable: true,
      });

      await repositories.timeEntries.recordTimeEntry(workspaceB.workspaceId, {
        userId: workspaceB.userId,
        clientId: workspaceB.clientId,
        contractId: workspaceB.contractId,
        workDate: currentMonthDay(15),
        durationMinutes: 480, // 8 hours
        description: "Workspace B work",
        billable: true,
      });

      // Each workspace should see only its own data
      const analyticsA = await analyticsService.getCurrentMonthAnalytics(workspaceAContext);
      expect(analyticsA.totalMinutes).toBe(240);
      expect(analyticsA.clientAllocations).toHaveLength(1);
      expect(analyticsA.clientAllocations[0].totalMinutes).toBe(240);

      const analyticsB = await analyticsService.getCurrentMonthAnalytics(workspaceBContext);
      expect(analyticsB.totalMinutes).toBe(480);
      expect(analyticsB.clientAllocations).toHaveLength(1);
      expect(analyticsB.clientAllocations[0].totalMinutes).toBe(480);
    });

    it("prevents foreign resource access through direct IDs", async () => {
      const workspaceAContext = {
        workspaceId: workspaceA.workspaceId,
        userId: workspaceA.userId,
        role: "OWNER" as const,
      };

      // Add time entry to workspace B to ensure data exists
      await repositories.timeEntries.recordTimeEntry(workspaceB.workspaceId, {
        userId: workspaceB.userId,
        clientId: workspaceB.clientId,
        contractId: workspaceB.contractId,
        workDate: currentMonthDay(15),
        durationMinutes: 480,
        description: "Workspace B work",
        billable: true,
      });

      // Verify workspace B has analytics data
      const workspaceBContext = {
        workspaceId: workspaceB.workspaceId,
        userId: workspaceB.userId,
        role: "OWNER" as const,
      };
      const analyticsB = await analyticsService.getCurrentMonthAnalytics(workspaceBContext);
      expect(analyticsB.totalMinutes).toBe(480);

      // Workspace A should remain isolated despite workspace B having data
      const analyticsA = await analyticsService.getCurrentMonthAnalytics(workspaceAContext);
      expect(analyticsA.totalMinutes).toBe(0);
      expect(analyticsA.clientAllocations).toHaveLength(0);
      expect(analyticsA.contractUtilizations).toHaveLength(0);
    });
  });

  describe("Workspace context validation", () => {
    it("rejects a malformed workspace identifier and reports empty analytics for an unknown one", async () => {
      const malformedContext = {
        workspaceId: "invalid-workspace-id",
        userId: workspaceA.userId,
        role: "OWNER" as const,
      };

      // A malformed identifier fails closed: it must never be silently reduced to
      // empty analytics, because that is indistinguishable from a real empty period.
      await expect(
        analyticsService.getCurrentMonthAnalytics(malformedContext),
      ).rejects.toBeInstanceOf(InvalidPersistenceStateError);

      await expect(
        analyticsService.getCurrentMonthAnalytics(malformedContext),
      ).rejects.toMatchObject({ code: "INVALID_PERSISTENCE_STATE" });

      // A well-formed but unknown workspace is rejected by the membership guard (P105-02).
      const unknownContext = {
        workspaceId: randomUUID(),
        userId: workspaceA.userId,
        role: "OWNER" as const,
      };

      await expect(
        analyticsService.getCurrentMonthAnalytics(unknownContext)
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });

    it("handles null/undefined workspace ID safely", async () => {
      const invalidContext = {
        workspaceId: null as unknown as string,
        userId: workspaceA.userId,
        role: "OWNER" as const,
      };

      await expect(async () => {
        await analyticsService.getCurrentMonthAnalytics(invalidContext);
      }).rejects.toThrow();
    });
  });
});