// tests/integration/persistence/repositories.test.ts
import { describe, expect, it } from "vitest";

import { createWorkspaceGraph } from "./fixtures";
import { date, repositories } from "./helpers";

describe("repository persistence", () => {
  it("persists workspace, member, and settings operations", async () => {
    const workspace = await repositories.workspaces.createWorkspace({
      name: "Ops Workspace",
      timezone: "Europe/Rome",
      currency: "EUR",
    });

    await repositories.members.addMember({
      workspaceId: workspace.id,
      userId: "owner-1",
      role: "OWNER",
    });

    const settings = await repositories.settings.putSettings(workspace.id, {
      timezone: "Europe/Rome",
      currency: "EUR",
      contractWarningPercent: 80,
      monthlyCapacityWarningPercent: 75,
    });

    const updated = await repositories.workspaces.updateWorkspace(workspace.id, {
      name: "Ops Workspace Updated",
    });

    expect(await repositories.workspaces.getWorkspaceById(workspace.id)).toMatchObject({
      id: workspace.id,
      name: "Ops Workspace Updated",
    });
    expect(updated.name).toBe("Ops Workspace Updated");
    expect(await repositories.members.getMember(workspace.id, "owner-1")).toMatchObject({
      role: "OWNER",
    });
    expect(await repositories.members.listMembers(workspace.id)).toHaveLength(1);
    expect(await repositories.settings.getSettings(workspace.id)).toEqual(settings);
  });

  it("persists client, contract, and time-entry workflows", async () => {
    const graph = await createWorkspaceGraph(repositories, "crud");

    const listedClients = await repositories.clients.listClients(graph.workspaceId, "ACTIVE");
    const covering = await repositories.contracts.findContractCoveringDate(
      graph.workspaceId,
      graph.clientId,
      date("2026-03-01"),
    );
    const archived = await repositories.clients.archiveClient(graph.workspaceId, graph.clientId);
    const timeEntry = await repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
      userId: graph.userId,
      clientId: graph.clientId,
      contractId: graph.contractId,
      workDate: date("2026-02-10"),
      durationMinutes: 90,
      description: "Integration work",
      billable: true,
    });

    expect(listedClients).toHaveLength(1);
    expect(covering?.id).toBe(graph.contractId);
    expect(archived.status).toBe("ARCHIVED");
    expect(await repositories.clients.getClient(graph.workspaceId, graph.clientId)).toMatchObject({
      status: "ARCHIVED",
    });
    expect(timeEntry.durationMinutes).toBe(90);
    expect(Number.isInteger(timeEntry.durationMinutes)).toBe(true);
    expect(timeEntry.contractId).toBe(graph.contractId);
    expect(await repositories.timeEntries.getTimeEntry(graph.workspaceId, timeEntry.id)).toMatchObject({
      id: timeEntry.id,
      contractId: graph.contractId,
      durationMinutes: 90,
    });
    expect(await repositories.timeEntries.listTimeEntriesForDate(graph.workspaceId, date("2026-02-10"))).toHaveLength(
      1,
    );
    expect(await repositories.contracts.getContract(graph.workspaceId, graph.contractId)).toMatchObject({
      rate: "80.0000",
    });
    expect(
      await repositories.contracts.listContractsForClient(graph.workspaceId, graph.clientId),
    ).toHaveLength(1);
  });

  it("keeps the historical contract reference after a later contract exists", async () => {
    const graph = await createWorkspaceGraph(repositories, "history");

    const timeEntry = await repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
      userId: graph.userId,
      clientId: graph.clientId,
      contractId: graph.contractId,
      workDate: date("2026-06-15"),
      durationMinutes: 120,
      billable: true,
    });

    const laterContract = await repositories.contracts.createContract(graph.workspaceId, {
      clientId: graph.clientId,
      validFrom: date("2026-07-01"),
      validTo: null,
      billingModel: "DAILY",
      rate: "500.1234",
      currency: "EUR",
    });

    const persisted = await repositories.timeEntries.getTimeEntry(graph.workspaceId, timeEntry.id);

    expect(laterContract.rate).toBe("500.1234");
    expect(persisted?.contractId).toBe(graph.contractId);
    expect(persisted?.contractId).not.toBe(laterContract.id);
  });

  it("persists alert and notification read-state operations", async () => {
    const graph = await createWorkspaceGraph(repositories, "alerts");
    const resolvedAt = new Date("2026-03-01T10:00:00.000Z");
    const readAt = new Date("2026-03-01T11:00:00.000Z");

    const alert = await repositories.alerts.createAlert(graph.workspaceId, {
      type: "CAPACITY_WARNING",
      severity: "WARNING",
      deduplicationKey: "capacity-warning-march",
    });
    const resolved = await repositories.alerts.resolveAlert(graph.workspaceId, alert.id, resolvedAt);
    const notification = await repositories.notifications.createNotification(graph.workspaceId, {
      userId: graph.userId,
      alertId: alert.id,
      type: "ALERT",
      title: "Capacity warning",
      body: "March capacity is approaching the threshold.",
    });
    const read = await repositories.notifications.markNotificationRead(
      graph.workspaceId,
      notification.id,
      readAt,
    );

    expect(await repositories.alerts.getAlert(graph.workspaceId, alert.id)).toMatchObject({
      resolvedAt,
    });
    expect(
      await repositories.alerts.findAlertByDeduplicationKey(graph.workspaceId, "capacity-warning-march"),
    ).toMatchObject({ id: alert.id });
    expect(resolved.resolvedAt).toEqual(resolvedAt);
    expect(read.readAt).toEqual(readAt);
    expect(await repositories.notifications.getNotification(graph.workspaceId, notification.id)).toMatchObject({
      type: "ALERT",
      readAt,
    });
    expect(await repositories.notifications.listNotificationsForUser(graph.workspaceId, graph.userId)).toHaveLength(1);
  });
});
