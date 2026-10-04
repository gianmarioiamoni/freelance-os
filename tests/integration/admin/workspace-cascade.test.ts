// tests/integration/admin/workspace-cascade.test.ts
import * as adminAuth from "@/application/admin/admin-authorization";
import { analyzeUserDeleteImpact } from "@/application/admin/analyze-user-delete-impact";
import { deleteUser } from "@/application/admin/delete-user";
import { prisma } from "@/infrastructure/prisma/client";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/application/admin/admin-authorization");

async function createUser(prefix: string): Promise<string> {
  const id = `${prefix}-${crypto.randomUUID()}`;
  await prisma.user.create({
    data: {
      id,
      name: prefix,
      email: `${id}@example.com`,
    },
  });
  return id;
}

async function createWorkspace(name: string): Promise<string> {
  const workspace = await prisma.workspace.create({
    data: {
      name,
      timezone: "UTC",
      currency: "EUR",
    },
  });
  return workspace.id;
}

async function addMember(
  workspaceId: string,
  userId: string,
  role: "OWNER" | "MEMBER",
): Promise<void> {
  await prisma.workspaceMember.create({
    data: { workspaceId, userId, role },
  });
}

async function seedDependentData(input: {
  workspaceId: string;
  userId: string;
}): Promise<{
  clientId: string;
  contractId: string;
  timeEntryId: string;
  invoiceId: string;
  paymentId: string;
  alertId: string;
  notificationId: string;
}> {
  await prisma.workspaceSettings.create({
    data: {
      workspaceId: input.workspaceId,
      timezone: "UTC",
      currency: "EUR",
      contractWarningPercent: 80,
      monthlyCapacityWarningPercent: 80,
    },
  });

  const client = await prisma.client.create({
    data: {
      workspaceId: input.workspaceId,
      companyName: "Cascade Client",
      status: "ACTIVE",
    },
  });

  const contract = await prisma.contract.create({
    data: {
      workspaceId: input.workspaceId,
      clientId: client.id,
      validFrom: new Date("2026-01-01"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
    },
  });

  const timeEntry = await prisma.timeEntry.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: new Date("2026-02-01"),
      durationMinutes: 60,
      billable: true,
      snapshotBillingModel: "HOURLY",
      snapshotRate: "80.0000",
      snapshotCurrency: "EUR",
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      workspaceId: input.workspaceId,
      contractId: contract.id,
      invoiceDate: new Date("2026-03-01"),
      amount: "80.0000",
      currency: "EUR",
    },
  });

  const payment = await prisma.payment.create({
    data: {
      workspaceId: input.workspaceId,
      invoiceId: invoice.id,
      paymentDate: new Date("2026-03-10"),
      amount: "80.0000",
      currency: "EUR",
    },
  });

  const alert = await prisma.alert.create({
    data: {
      workspaceId: input.workspaceId,
      type: "CONTRACT_WARNING",
      severity: "WARNING",
      clientId: client.id,
      contractId: contract.id,
      invoiceId: invoice.id,
      deduplicationKey: `cascade-${input.workspaceId}`,
    },
  });

  const notification = await prisma.notification.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      alertId: alert.id,
      type: "ALERT",
      title: "Cascade warning",
      body: "Dependent data fixture",
    },
  });

  return {
    clientId: client.id,
    contractId: contract.id,
    timeEntryId: timeEntry.id,
    invoiceId: invoice.id,
    paymentId: payment.id,
    alertId: alert.id,
    notificationId: notification.id,
  };
}

async function expectNoOrphans(workspaceId: string): Promise<void> {
  expect(
    await prisma.notification.count({ where: { workspaceId } }),
  ).toBe(0);
  expect(await prisma.alert.count({ where: { workspaceId } })).toBe(0);
  expect(await prisma.payment.count({ where: { workspaceId } })).toBe(0);
  expect(await prisma.invoice.count({ where: { workspaceId } })).toBe(0);
  expect(await prisma.timeEntry.count({ where: { workspaceId } })).toBe(0);
  expect(await prisma.contract.count({ where: { workspaceId } })).toBe(0);
  expect(await prisma.client.count({ where: { workspaceId } })).toBe(0);
  expect(
    await prisma.workspaceSettings.count({ where: { workspaceId } }),
  ).toBe(0);
  expect(
    await prisma.workspaceMember.count({ where: { workspaceId } }),
  ).toBe(0);
  expect(
    await prisma.workspace.findUnique({ where: { id: workspaceId } }),
  ).toBeNull();
}

describe("Admin workspace cascade regression", () => {
  const mockAdminUserId = "cascade-admin-123";

  beforeAll(() => {
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: mockAdminUserId,
      email: "admin@test.com",
    });
  });

  beforeEach(() => {
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: mockAdminUserId,
      email: "admin@test.com",
    });
  });

  it("A: deletes a user with no workspace and leaves unrelated workspaces intact", async () => {
    const targetUserId = await createUser("no-workspace");
    const strangerId = await createUser("stranger");
    const unrelatedWorkspaceId = await createWorkspace("Unrelated A");
    await addMember(unrelatedWorkspaceId, strangerId, "OWNER");

    const impact = await analyzeUserDeleteImpact(targetUserId);
    expect(impact.workspaces).toEqual([]);

    await deleteUser(targetUserId);

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { deletedAt: true },
    });
    expect(user?.deletedAt).not.toBeNull();
    expect(
      await prisma.workspace.findUnique({ where: { id: unrelatedWorkspaceId } }),
    ).not.toBeNull();
    expect(
      await prisma.user.findUnique({
        where: { id: strangerId },
        select: { deletedAt: true },
      }),
    ).toEqual({ deletedAt: null });
  });

  it("B: deletes a sole-owner workspace", async () => {
    const targetUserId = await createUser("sole-owner");
    const workspaceId = await createWorkspace("Sole Owner B");
    await addMember(workspaceId, targetUserId, "OWNER");

    await deleteUser(targetUserId);

    expect(await prisma.workspace.findUnique({ where: { id: workspaceId } })).toBeNull();
  });

  it("C: preserves a shared-owner workspace and the other owner", async () => {
    const targetUserId = await createUser("shared-target");
    const otherOwnerId = await createUser("shared-other");
    const workspaceId = await createWorkspace("Shared C");
    await addMember(workspaceId, targetUserId, "OWNER");
    await addMember(workspaceId, otherOwnerId, "OWNER");

    await deleteUser(targetUserId);

    expect(
      await prisma.workspace.findUnique({ where: { id: workspaceId } }),
    ).not.toBeNull();
    expect(
      await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: targetUserId },
        },
      }),
    ).toBeNull();
    expect(
      await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: otherOwnerId },
        },
      }),
    ).not.toBeNull();
    expect(
      await prisma.user.findUnique({
        where: { id: otherOwnerId },
        select: { deletedAt: true, email: true },
      }),
    ).toEqual({
      deletedAt: null,
      email: `${otherOwnerId}@example.com`,
    });
  });

  it("D: deletes every sole-owner workspace for the target", async () => {
    const targetUserId = await createUser("multi-sole");
    const firstWorkspaceId = await createWorkspace("Sole D1");
    const secondWorkspaceId = await createWorkspace("Sole D2");
    await addMember(firstWorkspaceId, targetUserId, "OWNER");
    await addMember(secondWorkspaceId, targetUserId, "OWNER");

    await deleteUser(targetUserId);

    expect(
      await prisma.workspace.findUnique({ where: { id: firstWorkspaceId } }),
    ).toBeNull();
    expect(
      await prisma.workspace.findUnique({ where: { id: secondWorkspaceId } }),
    ).toBeNull();
  });

  it("E: deletes sole-owner workspaces and preserves shared-owner workspaces", async () => {
    const targetUserId = await createUser("mixed-target");
    const otherOwnerId = await createUser("mixed-other");
    const soleWorkspaceId = await createWorkspace("Mixed Sole E");
    const sharedWorkspaceId = await createWorkspace("Mixed Shared E");
    await addMember(soleWorkspaceId, targetUserId, "OWNER");
    await addMember(sharedWorkspaceId, targetUserId, "OWNER");
    await addMember(sharedWorkspaceId, otherOwnerId, "OWNER");

    const impact = await analyzeUserDeleteImpact(targetUserId);
    expect(
      impact.workspaces.find((workspace) => workspace.workspaceId === soleWorkspaceId)
        ?.willBeDeleted,
    ).toBe(true);
    expect(
      impact.workspaces.find((workspace) => workspace.workspaceId === sharedWorkspaceId)
        ?.willBeDeleted,
    ).toBe(false);

    await deleteUser(targetUserId);

    expect(
      await prisma.workspace.findUnique({ where: { id: soleWorkspaceId } }),
    ).toBeNull();
    expect(
      await prisma.workspace.findUnique({ where: { id: sharedWorkspaceId } }),
    ).not.toBeNull();
    expect(
      await prisma.workspaceMember.count({
        where: { workspaceId: sharedWorkspaceId },
      }),
    ).toBe(1);
  });

  it("F: removes a member from a shared workspace without deleting it", async () => {
    const ownerId = await createUser("member-owner");
    const memberId = await createUser("member-target");
    const workspaceId = await createWorkspace("Shared Member F");
    await addMember(workspaceId, ownerId, "OWNER");
    await addMember(workspaceId, memberId, "MEMBER");

    await deleteUser(memberId);

    expect(
      await prisma.workspace.findUnique({ where: { id: workspaceId } }),
    ).not.toBeNull();
    expect(
      await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: memberId },
        },
      }),
    ).toBeNull();
    expect(
      await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: ownerId },
        },
      }),
    ).not.toBeNull();
  });

  it("G: preserves a workspace that has multiple remaining owners", async () => {
    const targetUserId = await createUser("multi-owner-target");
    const ownerBId = await createUser("multi-owner-b");
    const ownerCId = await createUser("multi-owner-c");
    const workspaceId = await createWorkspace("Multi Owner G");
    await addMember(workspaceId, targetUserId, "OWNER");
    await addMember(workspaceId, ownerBId, "OWNER");
    await addMember(workspaceId, ownerCId, "OWNER");

    await deleteUser(targetUserId);

    expect(
      await prisma.workspace.findUnique({ where: { id: workspaceId } }),
    ).not.toBeNull();
    expect(
      await prisma.workspaceMember.count({
        where: { workspaceId, role: "OWNER" },
      }),
    ).toBe(2);
  });

  it("H: deletes all dependent data for a populated sole-owner workspace and leaves unrelated data", async () => {
    const targetUserId = await createUser("populated-target");
    const strangerId = await createUser("populated-stranger");
    const workspaceId = await createWorkspace("Populated H");
    const unrelatedWorkspaceId = await createWorkspace("Unrelated H");
    await addMember(workspaceId, targetUserId, "OWNER");
    await addMember(unrelatedWorkspaceId, strangerId, "OWNER");

    const targetGraph = await seedDependentData({
      workspaceId,
      userId: targetUserId,
    });
    const unrelatedGraph = await seedDependentData({
      workspaceId: unrelatedWorkspaceId,
      userId: strangerId,
    });

    await deleteUser(targetUserId);

    await expectNoOrphans(workspaceId);
    expect(
      await prisma.client.findUnique({ where: { id: targetGraph.clientId } }),
    ).toBeNull();
    expect(
      await prisma.invoice.findUnique({ where: { id: targetGraph.invoiceId } }),
    ).toBeNull();
    expect(
      await prisma.payment.findUnique({ where: { id: targetGraph.paymentId } }),
    ).toBeNull();
    expect(
      await prisma.alert.findUnique({ where: { id: targetGraph.alertId } }),
    ).toBeNull();
    expect(
      await prisma.notification.findUnique({
        where: { id: targetGraph.notificationId },
      }),
    ).toBeNull();

    expect(
      await prisma.workspace.findUnique({ where: { id: unrelatedWorkspaceId } }),
    ).not.toBeNull();
    expect(
      await prisma.client.findUnique({ where: { id: unrelatedGraph.clientId } }),
    ).not.toBeNull();
    expect(
      await prisma.invoice.findUnique({
        where: { id: unrelatedGraph.invoiceId },
      }),
    ).not.toBeNull();
    expect(
      await prisma.user.findUnique({
        where: { id: strangerId },
        select: { deletedAt: true },
      }),
    ).toEqual({ deletedAt: null });
  });
});
