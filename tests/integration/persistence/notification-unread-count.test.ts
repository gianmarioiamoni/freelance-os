// tests/integration/persistence/notification-unread-count.test.ts
import { describe, expect, it } from "vitest";

import { createWorkspaceGraph } from "./fixtures";
import { repositories } from "./helpers";

describe("countUnreadNotificationsForUser", () => {
  it("returns 0 when user has no notifications", async () => {
    const graph = await createWorkspaceGraph(repositories, "unread-empty");
    const count = await repositories.notifications.countUnreadNotificationsForUser(
      graph.workspaceId,
      graph.userId,
    );
    expect(count).toBe(0);
  });

  it("returns the number of unread notifications when count > 0", async () => {
    const graph = await createWorkspaceGraph(repositories, "unread-has");

    await repositories.notifications.createNotification(graph.workspaceId, {
      userId: graph.userId,
      type: "ALERT",
      title: "First",
      body: "body",
    });
    await repositories.notifications.createNotification(graph.workspaceId, {
      userId: graph.userId,
      type: "ALERT",
      title: "Second",
      body: "body",
    });

    const count = await repositories.notifications.countUnreadNotificationsForUser(
      graph.workspaceId,
      graph.userId,
    );
    expect(count).toBe(2);
  });

  it("decreases count when a notification is marked as read", async () => {
    const graph = await createWorkspaceGraph(repositories, "unread-read");

    const n1 = await repositories.notifications.createNotification(graph.workspaceId, {
      userId: graph.userId,
      type: "ALERT",
      title: "Read me",
      body: "body",
    });
    await repositories.notifications.createNotification(graph.workspaceId, {
      userId: graph.userId,
      type: "ALERT",
      title: "Keep unread",
      body: "body",
    });

    await repositories.notifications.markNotificationRead(
      graph.workspaceId,
      n1.id,
      new Date(),
    );

    const count = await repositories.notifications.countUnreadNotificationsForUser(
      graph.workspaceId,
      graph.userId,
    );
    expect(count).toBe(1);
  });

  it("does not count notifications from another workspace", async () => {
    const graphA = await createWorkspaceGraph(repositories, "unread-ws-a");
    const graphB = await createWorkspaceGraph(repositories, "unread-ws-b");

    // Create a notification for graphB's user in graphB's workspace
    await repositories.notifications.createNotification(graphB.workspaceId, {
      userId: graphB.userId,
      type: "ALERT",
      title: "Other workspace",
      body: "body",
    });

    // graphA should see count 0 — the notification belongs to graphB
    const count = await repositories.notifications.countUnreadNotificationsForUser(
      graphA.workspaceId,
      graphA.userId,
    );
    expect(count).toBe(0);
  });

  it("does not count notifications from another user in the same workspace", async () => {
    const graph = await createWorkspaceGraph(repositories, "unread-user");
    // Add a second member to the same workspace
    const otherUserId = `other-user-isolation`;
    await repositories.members.addMember({
      workspaceId: graph.workspaceId,
      userId: otherUserId,
      role: "MEMBER",
    });

    await repositories.notifications.createNotification(graph.workspaceId, {
      userId: otherUserId,
      type: "ALERT",
      title: "Other user notification",
      body: "body",
    });

    const count = await repositories.notifications.countUnreadNotificationsForUser(
      graph.workspaceId,
      graph.userId,
    );
    expect(count).toBe(0);
  });
});
