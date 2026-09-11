// tests/integration/persistence/workspace-isolation.test.ts
import { describe, expect, it } from "vitest";

import { createWorkspaceGraph } from "./fixtures";
import { date, repositories } from "./helpers";

describe("workspace isolation", () => {
  it("does not expose workspace A records through workspace B repository operations", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "A");
    const workspaceB = await createWorkspaceGraph(repositories, "B");

    const timeEntry = await repositories.timeEntries.recordTimeEntry(workspaceA.workspaceId, {
      userId: workspaceA.userId,
      clientId: workspaceA.clientId,
      contractId: workspaceA.contractId,
      workDate: date("2026-02-01"),
      durationMinutes: 90,
      billable: true,
    });

    const alert = await repositories.alerts.createAlert(workspaceA.workspaceId, {
      type: "CONTRACT_WARNING",
      severity: "WARNING",
      clientId: workspaceA.clientId,
      contractId: workspaceA.contractId,
      deduplicationKey: "workspace-a-warning",
    });

    const notification = await repositories.notifications.createNotification(workspaceA.workspaceId, {
      userId: workspaceA.userId,
      alertId: alert.id,
      type: "ALERT",
      title: "Workspace A warning",
      body: "Isolation fixture",
    });

    expect(await repositories.clients.getClient(workspaceB.workspaceId, workspaceA.clientId)).toBeNull();
    expect(await repositories.contracts.getContract(workspaceB.workspaceId, workspaceA.contractId)).toBeNull();
    expect(await repositories.timeEntries.getTimeEntry(workspaceB.workspaceId, timeEntry.id)).toBeNull();
    expect(await repositories.alerts.getAlert(workspaceB.workspaceId, alert.id)).toBeNull();
    expect(
      await repositories.notifications.getNotification(workspaceB.workspaceId, notification.id),
    ).toBeNull();

    expect(await repositories.clients.listClients(workspaceB.workspaceId)).toHaveLength(1);
    expect(
      await repositories.contracts.listContractsForClient(workspaceB.workspaceId, workspaceA.clientId),
    ).toEqual([]);
    expect(await repositories.timeEntries.listTimeEntriesForDate(workspaceB.workspaceId, date("2026-02-01"))).toEqual(
      [],
    );
    expect(
      await repositories.notifications.listNotificationsForUser(workspaceB.workspaceId, workspaceA.userId),
    ).toEqual([]);
  });
});
