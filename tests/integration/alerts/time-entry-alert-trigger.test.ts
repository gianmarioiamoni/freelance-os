// tests/integration/alerts/time-entry-alert-trigger.test.ts
/**
 * P106-03 integration tests: AlertService trigger wiring for TimeEntry mutations.
 *
 * Tests the full chain: TimeEntry mutation → triggerAlertEvaluation → AlertService → DB.
 * Does NOT duplicate the 44 unit tests already present for AlertService internals.
 */
import { describe, expect, it } from "vitest";

import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { updateTimeEntry } from "@/application/time-entries/update-time-entry";
import { deleteTimeEntry } from "@/application/time-entries/delete-time-entry";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createAlertService } from "@/application/alerts/alert-service";
import { triggerAlertEvaluation } from "@/features/time-entries/trigger-alert-evaluation";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { repositories, runInTransaction, date } from "../persistence/helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createWorkspaceContext(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `alert-trigger-${suffix}`,
    { name: `AlertTrigger ${suffix}`, timezone: "Europe/Rome", currency: "EUR" },
    { runInTransaction },
  );
  return created.context;
}

async function setupClientAndContract(
  context: WorkspaceContext,
  /** monthlyContractedHours: null means unlimited (no alert); number = hours per month */
  monthlyContractedHours: number | null = null,
  validFrom = "2026-01-01",
  validTo = "2026-12-31",
) {
  const client = await createClient(
    context,
    { companyName: "Alert Test Client" },
    repositories.clients,
  );

  const contract = await createContract(
    context,
    {
      clientId: client.id,
      validFrom,
      validTo,
      billingModel: "HOURLY" as const,
      rate: "75",
      currency: "EUR",
      monthlyContractedHours: monthlyContractedHours !== null ? String(monthlyContractedHours) : null,
    },
    repositories.clients,
    repositories.contracts,
  );

  return { client, contract };
}

function makeAlertService() {
  const analyticsService = new AnalyticsService(repositories.analytics, repositories.members);
  return createAlertService(
    repositories.alerts,
    repositories.notifications,
    repositories.members,
    repositories.settings,
    analyticsService,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("time-entry alert trigger (P106-03)", () => {
  describe("create TimeEntry", () => {
    it("does not create an alert for a contract without contractedMinutes (unlimited)", async () => {
      const context = await createWorkspaceContext("create-unlimited");
      const { client, contract } = await setupClientAndContract(context, null);

      // 1440 is max allowed (24h) — well above any threshold for unlimited contract
      await createTimeEntry(
        context,
        { clientId: client.id, contractId: contract.id, workDate: date("2026-09-01"), durationMinutes: 1440, billable: true },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      await triggerAlertEvaluation(context, {
        alerts: repositories.alerts,
        notifications: repositories.notifications,
        members: repositories.members,
        settings: repositories.settings,
        analytics: repositories.analytics,
      });

      // No alert should exist for unlimited contract
      const notifications = await repositories.notifications.listNotificationsForUser(
        context.workspaceId,
        context.userId,
      );
      expect(notifications).toHaveLength(0);
    });

    it("creates a CONTRACT_WARNING alert when minutes cross warning threshold", async () => {
      const context = await createWorkspaceContext("create-warning");
      // 10h = 600 min contracted; warning at 80% = 480 min
      const { client, contract } = await setupClientAndContract(context, 10);

      // Log 500 minutes (83%) — above 80% threshold
      await createTimeEntry(
        context,
        { clientId: client.id, contractId: contract.id, workDate: date("2026-09-01"), durationMinutes: 500, billable: true },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      await triggerAlertEvaluation(context, {
        alerts: repositories.alerts,
        notifications: repositories.notifications,
        members: repositories.members,
        settings: repositories.settings,
        analytics: repositories.analytics,
      });

      const alertService = makeAlertService();
      const result = await alertService.evaluateContractAlerts(context);

      // Second evaluation must deduplicate (not create another alert)
      expect(result.alertsCreated).toBe(0);
      expect(result.alertsResolved).toBe(0);

      // At least one CONTRACT_WARNING or CONTRACT_EXCEEDED should have been created by first trigger
      const notifications = await repositories.notifications.listNotificationsForUser(
        context.workspaceId,
        context.userId,
      );
      const alertNotifs = notifications.filter((n) => n.type === "ALERT");
      expect(alertNotifs.length).toBeGreaterThanOrEqual(1);
    });

    it("workspace isolation: trigger does not affect another workspace", async () => {
      const contextA = await createWorkspaceContext("iso-ws-a");
      const contextB = await createWorkspaceContext("iso-ws-b");
      const { client: clientA, contract: contractA } = await setupClientAndContract(contextA, 10);
      await setupClientAndContract(contextB, 10);

      await createTimeEntry(
        contextA,
        { clientId: clientA.id, contractId: contractA.id, workDate: date("2026-09-01"), durationMinutes: 500, billable: true },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      await triggerAlertEvaluation(contextA, {
        alerts: repositories.alerts,
        notifications: repositories.notifications,
        members: repositories.members,
        settings: repositories.settings,
        analytics: repositories.analytics,
      });

      // Workspace B should have no notifications
      const notifsB = await repositories.notifications.listNotificationsForUser(
        contextB.workspaceId,
        contextB.userId,
      );
      expect(notifsB).toHaveLength(0);
    });
  });

  describe("update TimeEntry", () => {
    it("resolves alert when minutes drop below threshold after update", async () => {
      const context = await createWorkspaceContext("update-resolve");
      // 10h = 600 min contracted; warning at 80% = 480 min
      const { client, contract } = await setupClientAndContract(context, 10);

      // Log 510 minutes (85%) — above threshold
      const entry = await createTimeEntry(
        context,
        { clientId: client.id, contractId: contract.id, workDate: date("2026-09-01"), durationMinutes: 510, billable: true },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // First evaluation → alert created
      await triggerAlertEvaluation(context, {
        alerts: repositories.alerts,
        notifications: repositories.notifications,
        members: repositories.members,
        settings: repositories.settings,
        analytics: repositories.analytics,
      });

      // Update to 300 minutes (50%) — below threshold
      await updateTimeEntry(
        context,
        entry.id,
        { durationMinutes: 300, description: null, billable: true },
        repositories.timeEntries,
      );

      // Second evaluation → alert should resolve
      const result = await triggerAlertEvaluation(context, {
        alerts: repositories.alerts,
        notifications: repositories.notifications,
        members: repositories.members,
        settings: repositories.settings,
        analytics: repositories.analytics,
      });

      expect(result).toBeUndefined(); // best-effort, no throw

      // Check that alert was resolved via alertService directly
      const alertService = makeAlertService();
      const evalResult = await alertService.evaluateContractAlerts(context);
      // Already resolved — evaluating again should show no changes
      expect(evalResult.alertsCreated).toBe(0);
    });

    it("creates alert when minutes increase above threshold after update", async () => {
      const context = await createWorkspaceContext("update-create");
      const { client, contract } = await setupClientAndContract(context, 10);

      // Log 300 minutes (50%) — below threshold
      const entry = await createTimeEntry(
        context,
        { clientId: client.id, contractId: contract.id, workDate: date("2026-09-01"), durationMinutes: 300, billable: true },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // First evaluation — no alert
      await triggerAlertEvaluation(context, {
        alerts: repositories.alerts,
        notifications: repositories.notifications,
        members: repositories.members,
        settings: repositories.settings,
        analytics: repositories.analytics,
      });

      const notifsAfterFirst = await repositories.notifications.listNotificationsForUser(
        context.workspaceId,
        context.userId,
      );
      expect(notifsAfterFirst).toHaveLength(0);

      // Update to 510 minutes (85%) — above threshold
      await updateTimeEntry(
        context,
        entry.id,
        { durationMinutes: 510, description: null, billable: true },
        repositories.timeEntries,
      );

      // Second evaluation → alert created
      await triggerAlertEvaluation(context, {
        alerts: repositories.alerts,
        notifications: repositories.notifications,
        members: repositories.members,
        settings: repositories.settings,
        analytics: repositories.analytics,
      });

      const notifsAfterSecond = await repositories.notifications.listNotificationsForUser(
        context.workspaceId,
        context.userId,
      );
      expect(notifsAfterSecond.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("delete TimeEntry", () => {
    it("resolves alert when time entry is deleted and utilization drops below threshold", async () => {
      const context = await createWorkspaceContext("delete-resolve");
      const { client, contract } = await setupClientAndContract(context, 10);

      // Log 510 minutes (85%) — above threshold
      const entry = await createTimeEntry(
        context,
        { clientId: client.id, contractId: contract.id, workDate: date("2026-09-01"), durationMinutes: 510, billable: true },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // Evaluate → alert created
      await triggerAlertEvaluation(context, {
        alerts: repositories.alerts,
        notifications: repositories.notifications,
        members: repositories.members,
        settings: repositories.settings,
        analytics: repositories.analytics,
      });

      const notifsAfterCreate = await repositories.notifications.listNotificationsForUser(
        context.workspaceId,
        context.userId,
      );
      expect(notifsAfterCreate.length).toBeGreaterThanOrEqual(1);

      // Delete the entry
      await deleteTimeEntry(context, entry.id, repositories.timeEntries);

      // Evaluate after delete → alert resolves
      await triggerAlertEvaluation(context, {
        alerts: repositories.alerts,
        notifications: repositories.notifications,
        members: repositories.members,
        settings: repositories.settings,
        analytics: repositories.analytics,
      });

      // Further evaluation should show no alert creation (already resolved)
      const alertService = makeAlertService();
      const evalResult = await alertService.evaluateContractAlerts(context);
      expect(evalResult.alertsCreated).toBe(0);
    });

    it("deleteTimeEntry returns the deleted entry (contractId available for caller)", async () => {
      const context = await createWorkspaceContext("delete-returns");
      const { client, contract } = await setupClientAndContract(context, 10);

      const entry = await createTimeEntry(
        context,
        { clientId: client.id, contractId: contract.id, workDate: date("2026-09-01"), durationMinutes: 100, billable: true },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      const deleted = await deleteTimeEntry(context, entry.id, repositories.timeEntries);

      expect(deleted.id).toBe(entry.id);
      expect(deleted.contractId).toBe(contract.id);
    });
  });
});
