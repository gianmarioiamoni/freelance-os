// tests/integration/persistence/notifications.test.ts
import { describe, expect, it } from "vitest";

import { createWorkspaceGraph } from "./fixtures";
import { repositories } from "./helpers";

describe("alert and notification workspace consistency", () => {
  it("persists a notification for an alert in the same workspace", async () => {
    const graph = await createWorkspaceGraph(repositories, "notify");

    const alert = await repositories.alerts.createAlert(graph.workspaceId, {
      type: "CONTRACT_WARNING",
      severity: "WARNING",
      clientId: graph.clientId,
      contractId: graph.contractId,
      deduplicationKey: "same-workspace-warning",
    });

    const notification = await repositories.notifications.createNotification(graph.workspaceId, {
      userId: graph.userId,
      alertId: alert.id,
      type: "ALERT",
      title: "Contract warning",
      body: "Same-workspace notification",
    });

    expect(notification.workspaceId).toBe(graph.workspaceId);
    expect(notification.alertId).toBe(alert.id);
    expect(await repositories.alerts.getAlert(graph.workspaceId, alert.id)).toMatchObject({
      id: alert.id,
      clientId: graph.clientId,
    });
  });

  it("does not infer that Alert.clientId and Alert.contractId belong to the same client", async () => {
    const graph = await createWorkspaceGraph(repositories, "mixed");
    const otherClient = await repositories.clients.createClient(graph.workspaceId, {
      companyName: "Unrelated Client",
    });

    const alert = await repositories.alerts.createAlert(graph.workspaceId, {
      type: "CONTRACT_WARNING",
      severity: "WARNING",
      clientId: otherClient.id,
      contractId: graph.contractId,
      deduplicationKey: "mixed-client-contract",
    });

    expect(alert.clientId).toBe(otherClient.id);
    expect(alert.contractId).toBe(graph.contractId);
    expect(alert.clientId).not.toBe(graph.clientId);
  });
});
