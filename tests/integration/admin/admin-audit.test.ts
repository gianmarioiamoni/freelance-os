// tests/integration/admin/admin-audit.test.ts
import {
  UserAlreadyDisabledError,
  UserAlreadyDeletedError,
} from "@/application/admin/user-lifecycle-errors";
import * as adminAuth from "@/application/admin/admin-authorization";
import { deleteUser } from "@/application/admin/delete-user";
import { disableUser } from "@/application/admin/disable-user";
import { enableUser } from "@/application/admin/enable-user";
import * as recordAdminAction from "@/application/admin/record-admin-action";
import { prisma } from "@/infrastructure/prisma/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/application/admin/admin-authorization");

describe("Admin audit integrity", () => {
  const mockAdminUserId = "audit-admin-123";
  let targetUserId: string;

  beforeAll(() => {
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: mockAdminUserId,
      email: "admin@test.com",
    });
  });

  beforeEach(async () => {
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: mockAdminUserId,
      email: "admin@test.com",
    });

    targetUserId = `audit-user-${crypto.randomUUID()}`;
    await prisma.user.create({
      data: {
        id: targetUserId,
        name: "Audit Target",
        email: `${targetUserId}@example.com`,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: mockAdminUserId,
      email: "admin@test.com",
    });
  });

  it("creates a DISABLE_USER audit event with admin identity and server timestamp", async () => {
    const before = new Date();
    await disableUser(targetUserId);
    const after = new Date();

    const events = await prisma.adminAction.findMany({
      where: { targetUserId },
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe("DISABLE_USER");
    expect(events[0]?.adminUserId).toBe(mockAdminUserId);
    expect(events[0]?.targetUserId).toBe(targetUserId);
    expect(events[0]?.createdAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime() - 1000,
    );
    expect(events[0]?.createdAt.getTime()).toBeLessThanOrEqual(
      after.getTime() + 1000,
    );
  });

  it("creates an ENABLE_USER audit event for the same target", async () => {
    await disableUser(targetUserId);
    await enableUser(targetUserId);

    const events = await prisma.adminAction.findMany({
      where: { targetUserId },
      orderBy: { createdAt: "asc" },
    });

    expect(events.map((event) => event.action)).toEqual([
      "DISABLE_USER",
      "ENABLE_USER",
    ]);
    expect(events[1]?.adminUserId).toBe(mockAdminUserId);
    expect(events[1]?.targetUserId).toBe(targetUserId);
  });

  it("creates a DELETE_USER audit event that survives anonymization", async () => {
    const originalEmail = `${targetUserId}@example.com`;
    await deleteUser(targetUserId);

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { email: true, name: true, deletedAt: true },
    });
    const events = await prisma.adminAction.findMany({
      where: { action: "DELETE_USER", targetUserId },
    });

    expect(user?.deletedAt).not.toBeNull();
    expect(user?.email).toBe(`deleted-user-${targetUserId}@deleted.local`);
    expect(user?.name).toBe("Deleted User");
    expect(events).toHaveLength(1);
    expect(events[0]?.adminUserId).toBe(mockAdminUserId);
    expect(events[0]?.targetUserId).toBe(targetUserId);
    expect(JSON.stringify(events[0])).not.toContain(originalEmail);
  });

  it("does not write an audit event when a mutation is rejected", async () => {
    await disableUser(targetUserId);

    await expect(disableUser(targetUserId)).rejects.toThrow(
      UserAlreadyDisabledError,
    );

    const events = await prisma.adminAction.findMany({
      where: { targetUserId },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe("DISABLE_USER");
  });

  it("rolls back disable and audit when audit persistence fails", async () => {
    vi.spyOn(recordAdminAction, "recordAdminAction").mockRejectedValue(
      new Error("audit write failed"),
    );

    await expect(disableUser(targetUserId)).rejects.toThrow("audit write failed");

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { disabledAt: true },
    });
    const events = await prisma.adminAction.findMany({
      where: { targetUserId },
    });

    expect(user?.disabledAt).toBeNull();
    expect(events).toHaveLength(0);
  });

  it("rolls back delete and audit when audit persistence fails", async () => {
    const workspace = await prisma.workspace.create({
      data: {
        name: "Rollback Workspace",
        timezone: "UTC",
        currency: "EUR",
      },
    });
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: targetUserId,
        role: "OWNER",
      },
    });

    vi.spyOn(recordAdminAction, "recordAdminAction").mockRejectedValue(
      new Error("audit write failed"),
    );

    await expect(deleteUser(targetUserId)).rejects.toThrow("audit write failed");

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { deletedAt: true, email: true },
    });
    const preservedWorkspace = await prisma.workspace.findUnique({
      where: { id: workspace.id },
    });
    const events = await prisma.adminAction.findMany({
      where: { targetUserId },
    });

    expect(user?.deletedAt).toBeNull();
    expect(user?.email).toBe(`${targetUserId}@example.com`);
    expect(preservedWorkspace).not.toBeNull();
    expect(events).toHaveLength(0);
  });

  it("does not write a second DELETE_USER audit when delete is rejected", async () => {
    await deleteUser(targetUserId);

    await expect(deleteUser(targetUserId)).rejects.toThrow(
      UserAlreadyDeletedError,
    );

    expect(
      await prisma.adminAction.count({
        where: { targetUserId, action: "DELETE_USER" },
      }),
    ).toBe(1);
  });
});
