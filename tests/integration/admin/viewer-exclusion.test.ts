// tests/integration/admin/viewer-exclusion.test.ts
import { listUsers } from "@/application/admin/list-users";
import * as adminAuth from "@/application/admin/admin-authorization";
import { prisma } from "@/infrastructure/prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/application/admin/admin-authorization");

const adminUserId = "viewer-exclusion-admin";

describe("Admin Console: Viewer-only user exclusion", () => {
  let freelancerOnlyUserId: string;
  let viewerOnlyUserId: string;
  let dualRoleUserId: string;
  let workspaceId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: adminUserId,
      email: "admin@test.com",
    });

    freelancerOnlyUserId = `freelancer-only-${crypto.randomUUID()}`;
    viewerOnlyUserId = `viewer-only-${crypto.randomUUID()}`;
    dualRoleUserId = `dual-role-${crypto.randomUUID()}`;

    workspaceId = (
      await prisma.workspace.create({
        data: {
          name: "Viewer Exclusion Test Workspace",
          timezone: "UTC",
          currency: "EUR",
        },
      })
    ).id;

    await prisma.user.create({
      data: {
        id: freelancerOnlyUserId,
        name: "Freelancer Only",
        email: `${freelancerOnlyUserId}@example.com`,
      },
    });

    await prisma.user.create({
      data: {
        id: viewerOnlyUserId,
        name: "Viewer Only",
        email: `${viewerOnlyUserId}@example.com`,
      },
    });

    await prisma.user.create({
      data: {
        id: dualRoleUserId,
        name: "Dual Role",
        email: `${dualRoleUserId}@example.com`,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: freelancerOnlyUserId,
        role: "MEMBER",
      },
    });

    await prisma.timesheetViewerAccess.create({
      data: {
        workspaceId,
        userId: viewerOnlyUserId,
        email: `${viewerOnlyUserId}@example.com`,
        status: "ACTIVE",
        activatedAt: new Date(),
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: dualRoleUserId,
        role: "MEMBER",
      },
    });

    await prisma.timesheetViewerAccess.create({
      data: {
        workspaceId,
        userId: dualRoleUserId,
        email: `${dualRoleUserId}@example.com`,
        status: "ACTIVE",
        activatedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await prisma.timesheetViewerAccess.deleteMany({
      where: { workspaceId },
    });
    await prisma.workspaceMember.deleteMany({
      where: { workspaceId },
    });
    await prisma.workspace.delete({
      where: { id: workspaceId },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [freelancerOnlyUserId, viewerOnlyUserId, dualRoleUserId],
        },
      },
    });
  });

  it("excludes viewer-only users from admin console", async () => {
    const users = await listUsers();

    const userIds = users.map((u) => u.id);

    expect(userIds).not.toContain(viewerOnlyUserId);
  });

  it("includes freelancer-only users in admin console", async () => {
    const users = await listUsers();

    const freelancerUser = users.find((u) => u.id === freelancerOnlyUserId);

    expect(freelancerUser).toBeDefined();
    expect(freelancerUser?.email).toBe(`${freelancerOnlyUserId}@example.com`);
  });

  it("includes users with both freelancer and viewer roles", async () => {
    const users = await listUsers();

    const dualUser = users.find((u) => u.id === dualRoleUserId);

    expect(dualUser).toBeDefined();
    expect(dualUser?.email).toBe(`${dualRoleUserId}@example.com`);
  });

  it("correctly marks admin user with isAdmin flag", async () => {
    await prisma.user.create({
      data: {
        id: adminUserId,
        name: "Admin User",
        email: "admin@test.com",
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: adminUserId,
        role: "OWNER",
      },
    });

    const users = await listUsers();

    const adminUser = users.find((u) => u.id === adminUserId);
    const regularUser = users.find((u) => u.id === freelancerOnlyUserId);

    expect(adminUser?.isAdmin).toBe(true);
    expect(regularUser?.isAdmin).toBe(false);
  });
});
