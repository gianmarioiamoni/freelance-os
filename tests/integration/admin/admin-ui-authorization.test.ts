// tests/integration/admin/admin-ui-authorization.test.ts
import { UnauthorizedAdminAccessError } from "@/application/admin/admin-errors";
import * as adminAuth from "@/application/admin/admin-authorization";
import { listUsers } from "@/application/admin/list-users";
import { deleteUserAction } from "@/features/admin/delete-user-action";
import { disableUserAction } from "@/features/admin/disable-user-action";
import { enableUserAction } from "@/features/admin/enable-user-action";
import { getDeleteImpactAction } from "@/features/admin/get-delete-impact-action";
import { prisma } from "@/infrastructure/prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/application/admin/admin-authorization");
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const adminUserId = "admin-ui-123";

describe("Admin UI authorization and mutations", () => {
  let targetUserId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: adminUserId,
      email: "admin@test.com",
    });

    targetUserId = `ui-user-${crypto.randomUUID()}`;
    await prisma.user.create({
      data: {
        id: targetUserId,
        name: "Managed User",
        email: `${targetUserId}@example.com`,
      },
    });
  });

  afterEach(async () => {
    await prisma.workspaceMember.deleteMany({
      where: { userId: { in: [targetUserId, adminUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [targetUserId, adminUserId] } },
    });
  });

  it("allows Admin to retrieve the user list", async () => {
    const users = await listUsers();

    expect(users.some((user) => user.id === targetUserId)).toBe(true);
    expect(users.find((user) => user.id === targetUserId)?.isAdmin).toBe(false);
  });

  it("rejects user listing for a normal user", async () => {
    vi.mocked(adminAuth.requireAdminAuthorization).mockRejectedValue(
      new UnauthorizedAdminAccessError(),
    );

    await expect(listUsers()).rejects.toThrow(UnauthorizedAdminAccessError);
  });

  it("allows Admin to disable and enable a user", async () => {
    await expect(disableUserAction(targetUserId)).resolves.toBeNull();

    let user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { disabledAt: true },
    });
    expect(user?.disabledAt).not.toBeNull();

    await expect(enableUserAction(targetUserId)).resolves.toBeNull();

    user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { disabledAt: true },
    });
    expect(user?.disabledAt).toBeNull();
  });

  it("allows Admin to request delete impact", async () => {
    const workspace = await prisma.workspace.create({
      data: {
        name: "Impact Workspace",
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

    const result = await getDeleteImpactAction(targetUserId);

    expect(result.error).toBeNull();
    expect(result.analysis?.workspaces).toEqual([
      expect.objectContaining({
        workspaceName: "Impact Workspace",
        willBeDeleted: true,
      }),
    ]);
  });

  it("allows Admin to delete a user", async () => {
    await expect(deleteUserAction(targetUserId)).resolves.toBeNull();

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true, email: true, deletedAt: true },
    });

    expect(user?.deletedAt).not.toBeNull();
    expect(user?.name).toBe("Deleted User");
    expect(user?.email).toBe(`deleted-user-${targetUserId}@deleted.local`);
  });

  it("prevents Admin from deleting itself", async () => {
    const result = await deleteUserAction(adminUserId);

    expect(result).toEqual({ error: "Admin cannot delete itself." });
  });

  it("rejects lifecycle mutations for a normal user", async () => {
    vi.mocked(adminAuth.requireAdminAuthorization).mockRejectedValue(
      new UnauthorizedAdminAccessError(),
    );

    await expect(disableUserAction(targetUserId)).resolves.toEqual({
      error: "Unauthorized admin access.",
    });
    await expect(enableUserAction(targetUserId)).resolves.toEqual({
      error: "Unauthorized admin access.",
    });
    await expect(deleteUserAction(targetUserId)).resolves.toEqual({
      error: "Unauthorized admin access.",
    });
    await expect(getDeleteImpactAction(targetUserId)).resolves.toEqual({
      analysis: null,
      error: "Unauthorized admin access.",
    });

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { disabledAt: true, deletedAt: true },
    });
    expect(user?.disabledAt).toBeNull();
    expect(user?.deletedAt).toBeNull();
  });
});
