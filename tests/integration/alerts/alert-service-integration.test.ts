// tests/integration/alerts/alert-service-integration.test.ts
/**
 * P106-05 integration tests: AlertService boundary, deduplication, resolution, re-trigger.
 *
 * Proves actual persisted behaviour via the real AlertService integration path
 * (not just repository-level mocks). Complements the 34 unit tests in alert-service.test.ts.
 */
import { describe, expect, it } from "vitest";

import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { updateTimeEntry } from "@/application/time-entries/update-time-entry";
import { deleteTimeEntry } from "@/application/time-entries/delete-time-entry";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createAlertService } from "@/application/alerts/alert-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { repositories, runInTransaction, date } from "../persistence/helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildContext(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `p106-05-${suffix}`,
    { name: `P106-05 ${suffix}`, timezone: "Europe/Rome", currency: "EUR" },
    { runInTransaction },
  );
  return created.context;
}

async function buildContract(
  context: WorkspaceContext,
  monthlyContractedHours: number | null,
) {
  const client = await createClient(
    context,
    { companyName: `Client ${context.workspaceId.slice(-4)}` },
    repositories.clients,
  );
  const contract = await createContract(
    context,
    {
      clientId: client.id,
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      billingModel: "HOURLY" as const,
      rate: "75",
      currency: "EUR",
      monthlyContractedHours:
        monthlyContractedHours !== null ? String(monthlyContractedHours) : null,
    },
    repositories.clients,
    repositories.contracts,
  );
  return { client, contract };
}

function makeAlertService() {
  const analytics = new AnalyticsService(
    repositories.analytics,
    repositories.members,
  );
  return createAlertService(
    repositories.alerts,
    repositories.notifications,
    repositories.members,
    repositories.settings,
    analytics,
  );
}

async function logEntry(
  context: WorkspaceContext,
  clientId: string,
  contractId: string,
  durationMinutes: number,
  workDate = "2026-09-01",
) {
  return createTimeEntry(
    context,
    {
      clientId,
      contractId,
      workDate: date(workDate),
      durationMinutes,
      billable: true,
    },
    repositories.clients,
    repositories.contracts,
    repositories.timeEntries,
  );
}

// ---------------------------------------------------------------------------
// Boundary cases
// ---------------------------------------------------------------------------

describe("P106-05 — boundary conditions (integration)", () => {
  describe("Case 1 — below threshold (<80%)", () => {
    it("produces no alert and no notification when utilization is below 80%", async () => {
      // 10h = 600 min contracted; 79% ≈ 474 min
      const context = await buildContext("boundary-below");
      const { client, contract } = await buildContract(context, 10);

      await logEntry(context, client.id, contract.id, 474);

      const svc = makeAlertService();
      const result = await svc.evaluateContractAlerts(context);

      expect(result.alertsCreated).toBe(0);
      expect(result.alertsResolved).toBe(0);

      const notifications = await repositories.notifications.listNotificationsForUser(
        context.workspaceId,
        context.userId,
      );
      expect(notifications).toHaveLength(0);
    });
  });

  describe("Case 2 — exact warning threshold (=80%)", () => {
    it("creates CONTRACT_WARNING at exactly 80%", async () => {
      // 10h = 600 min; 80% = 480 min
      const context = await buildContext("boundary-exact80");
      const { client, contract } = await buildContract(context, 10);

      await logEntry(context, client.id, contract.id, 480);

      const svc = makeAlertService();
      const result = await svc.evaluateContractAlerts(context);

      expect(result.alertsCreated).toBeGreaterThanOrEqual(1);
      const contractResult = result.contractResults.find(
        (r) => r.contractId === contract.id,
      );
      expect(contractResult?.warning.action).toBe("created");
      expect(contractResult?.exceeded.action).toBe("none");

      const notifications = await repositories.notifications.listNotificationsForUser(
        context.workspaceId,
        context.userId,
      );
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications.some((n) => n.readAt === null)).toBe(true);
    });
  });

  describe("Case 3 — above warning / below exceeded (80% < u < 100%)", () => {
    it("creates only CONTRACT_WARNING (no CONTRACT_EXCEEDED) for 90%", async () => {
      // 10h = 600 min; 90% = 540 min
      const context = await buildContext("boundary-warning-only");
      const { client, contract } = await buildContract(context, 10);

      await logEntry(context, client.id, contract.id, 540);

      const svc = makeAlertService();
      const result = await svc.evaluateContractAlerts(context);

      const contractResult = result.contractResults.find(
        (r) => r.contractId === contract.id,
      );
      expect(contractResult?.warning.action).toBe("created");
      expect(contractResult?.exceeded.action).toBe("none");
    });
  });

  describe("Case 4 — exact exceeded boundary (=100%)", () => {
    it("creates both CONTRACT_WARNING and CONTRACT_EXCEEDED at exactly 100%", async () => {
      // 10h = 600 min; 100% = 600 min
      const context = await buildContext("boundary-exact100");
      const { client, contract } = await buildContract(context, 10);

      await logEntry(context, client.id, contract.id, 600);

      const svc = makeAlertService();
      const result = await svc.evaluateContractAlerts(context);

      const contractResult = result.contractResults.find(
        (r) => r.contractId === contract.id,
      );
      expect(contractResult?.warning.action).toBe("created");
      expect(contractResult?.exceeded.action).toBe("created");
      expect(result.alertsCreated).toBe(2);
    });
  });

  describe("Case 5 — above exceeded (>100%)", () => {
    it("creates both CONTRACT_WARNING and CONTRACT_EXCEEDED above 100%", async () => {
      // 10h = 600 min; 700 min = 116%
      const context = await buildContext("boundary-above100");
      const { client, contract } = await buildContract(context, 10);

      await logEntry(context, client.id, contract.id, 700);

      const svc = makeAlertService();
      const result = await svc.evaluateContractAlerts(context);

      const contractResult = result.contractResults.find(
        (r) => r.contractId === contract.id,
      );
      expect(contractResult?.warning.action).toBe("created");
      expect(contractResult?.exceeded.action).toBe("created");
    });
  });

  describe("Case 6 — unlimited contract (contractedMinutes = null)", () => {
    it("produces no alert for an unlimited contract regardless of minutes logged", async () => {
      const context = await buildContext("boundary-unlimited");
      const { client, contract } = await buildContract(context, null);

      // Log max allowed duration — unlimited contract still produces no alert
      await logEntry(context, client.id, contract.id, 1440);

      const svc = makeAlertService();
      const result = await svc.evaluateContractAlerts(context);

      expect(result.alertsCreated).toBe(0);
      const notifications = await repositories.notifications.listNotificationsForUser(
        context.workspaceId,
        context.userId,
      );
      expect(notifications).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Deduplication — via AlertService integration path
// ---------------------------------------------------------------------------

describe("P106-05 — deduplication (integration)", () => {
  it("first evaluation creates alert + notification", async () => {
    const context = await buildContext("dedup-first");
    const { client, contract } = await buildContract(context, 10);
    await logEntry(context, client.id, contract.id, 500); // 83%

    const svc = makeAlertService();
    const result = await svc.evaluateContractAlerts(context);

    expect(result.alertsCreated).toBeGreaterThanOrEqual(1);
    expect(result.notificationsCreated).toBeGreaterThanOrEqual(1);
  });

  it("second evaluation under same condition creates no duplicate alert or notification", async () => {
    const context = await buildContext("dedup-second");
    const { client, contract } = await buildContract(context, 10);
    await logEntry(context, client.id, contract.id, 500); // 83%

    const svc = makeAlertService();
    await svc.evaluateContractAlerts(context); // first

    const secondResult = await svc.evaluateContractAlerts(context); // second — same condition

    const contractResult = secondResult.contractResults.find(
      (r) => r.contractId === contract.id,
    );
    expect(contractResult?.warning.action).toBe("deduplicated");
    expect(secondResult.alertsCreated).toBe(0);
    expect(secondResult.notificationsCreated).toBe(0);

    const notifications = await repositories.notifications.listNotificationsForUser(
      context.workspaceId,
      context.userId,
    );
    // Only the original notification, not a duplicate
    const alertNotifs = notifications.filter((n) => n.type === "ALERT");
    expect(alertNotifs.length).toBeLessThanOrEqual(2); // at most 1 per alert type, not doubled
    // Specifically: no new creation on second evaluation
    expect(secondResult.alertsCreated).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Resolution — condition drops below threshold
// ---------------------------------------------------------------------------

describe("P106-05 — resolution (integration)", () => {
  it("resolves active alert when utilization drops below threshold via TimeEntry update", async () => {
    const context = await buildContext("resolve-update");
    const { client, contract } = await buildContract(context, 10);

    // Log 500 min (83%) → alert fires
    const entry = await logEntry(context, client.id, contract.id, 500);
    const svc = makeAlertService();
    const firstResult = await svc.evaluateContractAlerts(context);
    expect(firstResult.alertsCreated).toBeGreaterThanOrEqual(1);

    // Reduce to 300 min (50%) → alert resolves
    await updateTimeEntry(
      context,
      entry.id,
      { durationMinutes: 300, description: null, billable: true },
      repositories.timeEntries,
    );

    const resolveResult = await svc.evaluateContractAlerts(context);
    const contractResult = resolveResult.contractResults.find(
      (r) => r.contractId === contract.id,
    );
    expect(contractResult?.warning.action).toBe("resolved");
    expect(resolveResult.alertsResolved).toBeGreaterThanOrEqual(1);

    // Notification remains persisted — resolution does not delete notifications
    const notifications = await repositories.notifications.listNotificationsForUser(
      context.workspaceId,
      context.userId,
    );
    expect(notifications.length).toBeGreaterThanOrEqual(1);
  });

  it("resolves active alert when TimeEntry is deleted and utilization drops to 0", async () => {
    const context = await buildContext("resolve-delete");
    const { client, contract } = await buildContract(context, 10);

    const entry = await logEntry(context, client.id, contract.id, 500);
    const svc = makeAlertService();
    await svc.evaluateContractAlerts(context); // alert created

    await deleteTimeEntry(context, entry.id, repositories.timeEntries);

    const resolveResult = await svc.evaluateContractAlerts(context);
    const contractResult = resolveResult.contractResults.find(
      (r) => r.contractId === contract.id,
    );
    expect(contractResult?.warning.action).toBe("resolved");
  });

  it("reading a notification does NOT resolve the alert", async () => {
    const context = await buildContext("resolve-read-independence");
    const { client, contract } = await buildContract(context, 10);

    await logEntry(context, client.id, contract.id, 500);
    const svc = makeAlertService();
    await svc.evaluateContractAlerts(context);

    const notifications = await repositories.notifications.listNotificationsForUser(
      context.workspaceId,
      context.userId,
    );
    const notif = notifications.find((n) => n.readAt === null);
    if (!notif) throw new Error("Expected an unread notification");

    // Mark as read
    await svc.markNotificationRead(context, notif.id);

    // Alert should still be active (not resolved)
    const evalAfterRead = await svc.evaluateContractAlerts(context);
    const contractResult = evalAfterRead.contractResults.find(
      (r) => r.contractId === contract.id,
    );
    // Condition still true → deduplicated (active alert still exists)
    expect(contractResult?.warning.action).toBe("deduplicated");
  });
});

// ---------------------------------------------------------------------------
// Re-trigger — resolve then re-fire
// ---------------------------------------------------------------------------

describe("P106-05 — re-trigger (integration)", () => {
  it("creates a new alert after resolution when condition fires again", async () => {
    const context = await buildContext("retrigger");
    const { client, contract } = await buildContract(context, 10);

    // Step 1: log above threshold → alert created
    const entry = await logEntry(context, client.id, contract.id, 500);
    const svc = makeAlertService();
    const firstResult = await svc.evaluateContractAlerts(context);
    expect(firstResult.alertsCreated).toBeGreaterThanOrEqual(1);

    // Step 2: update below threshold → alert resolved
    await updateTimeEntry(
      context,
      entry.id,
      { durationMinutes: 300, description: null, billable: true },
      repositories.timeEntries,
    );
    const resolveResult = await svc.evaluateContractAlerts(context);
    expect(resolveResult.alertsResolved).toBeGreaterThanOrEqual(1);

    // Step 3: add another entry → condition re-fires
    await logEntry(context, client.id, contract.id, 300, "2026-09-02"); // total 600 min = 100%
    const retriggerResult = await svc.evaluateContractAlerts(context);

    // New alert created (re-trigger)
    expect(retriggerResult.alertsCreated).toBeGreaterThanOrEqual(1);
    expect(retriggerResult.notificationsCreated).toBeGreaterThanOrEqual(1);

    // Should now have at least 2 notifications (one from first fire, one from re-trigger)
    const notifications = await repositories.notifications.listNotificationsForUser(
      context.workspaceId,
      context.userId,
    );
    expect(notifications.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Threshold override via WorkspaceSettings
// ---------------------------------------------------------------------------

describe("P106-05 — threshold override (integration)", () => {
  it("respects WorkspaceSettings.contractWarningPercent when set to non-default", async () => {
    // Set custom threshold to 90%
    const context = await buildContext("threshold-override");
    const existingSettings = await repositories.settings.getSettings(context.workspaceId);
    await repositories.settings.putSettings(context.workspaceId, {
      timezone: existingSettings?.timezone ?? "Europe/Rome",
      currency: existingSettings?.currency ?? "EUR",
      contractWarningPercent: 90,
      monthlyCapacityWarningPercent: existingSettings?.monthlyCapacityWarningPercent ?? 80,
    });
    const { client, contract } = await buildContract(context, 10);

    // 85% = 510 min — below 90% threshold, should NOT fire
    await logEntry(context, client.id, contract.id, 510);
    const svc = makeAlertService();
    const result = await svc.evaluateContractAlerts(context);

    const contractResult = result.contractResults.find(
      (r) => r.contractId === contract.id,
    );
    expect(contractResult?.warning.action).toBe("none");
    expect(result.alertsCreated).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Workspace isolation (integration path)
// ---------------------------------------------------------------------------

describe("P106-05 — workspace isolation (integration)", () => {
  it("workspace B cannot see workspace A notifications", async () => {
    const contextA = await buildContext("ws-iso-a");
    const contextB = await buildContext("ws-iso-b");

    const { client: clientA, contract: contractA } = await buildContract(contextA, 10);
    await logEntry(contextA, clientA.id, contractA.id, 500);

    const svcA = makeAlertService();
    await svcA.evaluateContractAlerts(contextA);

    const notifsA = await repositories.notifications.listNotificationsForUser(
      contextA.workspaceId,
      contextA.userId,
    );
    const notifsB = await repositories.notifications.listNotificationsForUser(
      contextB.workspaceId,
      contextB.userId,
    );

    expect(notifsA.length).toBeGreaterThanOrEqual(1);
    expect(notifsB).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Notification ownership / read state (integration)
// ---------------------------------------------------------------------------

describe("P106-05 — notification ownership and read state (integration)", () => {
  it("markNotificationRead persists readAt and is returned on re-fetch", async () => {
    const context = await buildContext("read-persist");
    const { client, contract } = await buildContract(context, 10);
    await logEntry(context, client.id, contract.id, 500);

    const svc = makeAlertService();
    await svc.evaluateContractAlerts(context);

    const notifications = await repositories.notifications.listNotificationsForUser(
      context.workspaceId,
      context.userId,
    );
    const unread = notifications.find((n) => n.readAt === null);
    if (!unread) throw new Error("Expected an unread notification");

    await svc.markNotificationRead(context, unread.id);

    const fetched = await repositories.notifications.getNotification(
      context.workspaceId,
      unread.id,
    );
    expect(fetched?.readAt).not.toBeNull();
  });

  it("markNotificationRead is idempotent (re-reading does not error or create duplicates)", async () => {
    const context = await buildContext("read-idempotent");
    const { client, contract } = await buildContract(context, 10);
    await logEntry(context, client.id, contract.id, 500);

    const svc = makeAlertService();
    await svc.evaluateContractAlerts(context);

    const notifications = await repositories.notifications.listNotificationsForUser(
      context.workspaceId,
      context.userId,
    );
    const unread = notifications.find((n) => n.readAt === null);
    if (!unread) throw new Error("Expected an unread notification");

    await svc.markNotificationRead(context, unread.id);
    // Second read — must not throw
    await expect(
      svc.markNotificationRead(context, unread.id),
    ).resolves.toBeDefined();

    const notificationsAfter =
      await repositories.notifications.listNotificationsForUser(
        context.workspaceId,
        context.userId,
      );
    // No duplicate notification created
    expect(notificationsAfter).toHaveLength(notifications.length);
  });
});
