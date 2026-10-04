// tests/integration/admin/admin-idor.test.ts
import { UnauthorizedAdminAccessError } from "@/application/admin/admin-errors";
import { deleteUser } from "@/application/admin/delete-user";
import { disableUser } from "@/application/admin/disable-user";
import { enableUser } from "@/application/admin/enable-user";
import { listUsers } from "@/application/admin/list-users";
import { AdminSelfProtectionError } from "@/application/admin/user-lifecycle-errors";
import { deleteUserAction } from "@/features/admin/delete-user-action";
import { disableUserAction } from "@/features/admin/disable-user-action";
import { enableUserAction } from "@/features/admin/enable-user-action";
import { getDeleteImpactAction } from "@/features/admin/get-delete-impact-action";
import { prisma } from "@/infrastructure/prisma/client";
import { headers } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerUser, uniqueEmail } from "../auth/helpers";
import { createGoogleAccount, signInHeadersWithGoogleAccount } from "./helpers";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const ADMIN_EMAIL = "idor-admin@example.com";

async function createWorkspaceOwner(userId: string, name: string): Promise<string> {
  const workspace = await prisma.workspace.create({
    data: {
      name,
      timezone: "UTC",
      currency: "EUR",
    },
  });
  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId,
      role: "OWNER",
    },
  });
  return workspace.id;
}

describe("Admin IDOR and target manipulation", () => {
  let originalAdminEmail: string | undefined;

  beforeEach(() => {
    originalAdminEmail = process.env.ADMIN_GOOGLE_EMAIL;
    process.env.ADMIN_GOOGLE_EMAIL = ADMIN_EMAIL;
  });

  afterEach(() => {
    process.env.ADMIN_GOOGLE_EMAIL = originalAdminEmail;
    vi.mocked(headers).mockReset();
  });

  async function signInAdmin(): Promise<{ userId: string; requestHeaders: Headers }> {
    const { userId } = await registerUser({
      email: ADMIN_EMAIL,
      name: "IDOR Admin",
    });
    await createGoogleAccount(userId);
    const requestHeaders = await signInHeadersWithGoogleAccount({
      email: ADMIN_EMAIL,
    });
    vi.mocked(headers).mockResolvedValue(requestHeaders);
    return { userId, requestHeaders };
  }

  async function signInNormalUser(): Promise<{
    userId: string;
    email: string;
    requestHeaders: Headers;
  }> {
    const email = uniqueEmail("idor-normal");
    const { userId } = await registerUser({ email, name: "Normal User" });
    const requestHeaders = await signInHeadersWithGoogleAccount({ email });
    vi.mocked(headers).mockResolvedValue(requestHeaders);
    return { userId, email, requestHeaders };
  }

  it("rejects lifecycle actions when a normal user supplies another user id", async () => {
    const target = await registerUser({
      email: uniqueEmail("idor-target"),
      name: "Target User",
    });
    await signInNormalUser();

    await expect(disableUser(target.userId)).rejects.toThrow(
      UnauthorizedAdminAccessError,
    );
    await expect(enableUser(target.userId)).rejects.toThrow(
      UnauthorizedAdminAccessError,
    );
    await expect(deleteUser(target.userId)).rejects.toThrow(
      UnauthorizedAdminAccessError,
    );
    await expect(listUsers()).rejects.toThrow(UnauthorizedAdminAccessError);

    await expect(disableUserAction(target.userId)).resolves.toEqual({
      error: "Unauthorized admin access.",
    });
    await expect(enableUserAction(target.userId)).resolves.toEqual({
      error: "Unauthorized admin access.",
    });
    await expect(deleteUserAction(target.userId)).resolves.toEqual({
      error: "Unauthorized admin access.",
    });
    await expect(getDeleteImpactAction(target.userId)).resolves.toEqual({
      analysis: null,
      error: "Unauthorized admin access.",
    });

    const user = await prisma.user.findUnique({
      where: { id: target.userId },
      select: { disabledAt: true, deletedAt: true },
    });
    expect(user).toEqual({ disabledAt: null, deletedAt: null });
  });

  it("authorizes from the authenticated Admin identity, never from the supplied targetUserId", async () => {
    const admin = await signInAdmin();
    const targetA = await registerUser({
      email: uniqueEmail("idor-a"),
      name: "User A",
    });
    const targetB = await registerUser({
      email: uniqueEmail("idor-b"),
      name: "User B",
    });
    const workspaceA = await createWorkspaceOwner(targetA.userId, "Workspace A");
    const workspaceB = await createWorkspaceOwner(targetB.userId, "Workspace B");

    await deleteUser(targetA.userId);

    expect(
      await prisma.workspace.findUnique({ where: { id: workspaceA } }),
    ).toBeNull();
    expect(
      await prisma.workspace.findUnique({ where: { id: workspaceB } }),
    ).not.toBeNull();

    const userB = await prisma.user.findUnique({
      where: { id: targetB.userId },
      select: { deletedAt: true, email: true },
    });
    expect(userB?.deletedAt).toBeNull();
    expect(userB?.email).toContain("idor-b");

    const adminUser = await prisma.user.findUnique({
      where: { id: admin.userId },
      select: { deletedAt: true, email: true },
    });
    expect(adminUser?.deletedAt).toBeNull();
    expect(adminUser?.email).toBe(ADMIN_EMAIL);
  });

  it("does not let a forged targetUserId delete an unrelated user's workspace", async () => {
    await signInAdmin();
    const target = await registerUser({
      email: uniqueEmail("idor-member"),
      name: "Member Target",
    });
    const unrelatedOwner = await registerUser({
      email: uniqueEmail("idor-unrelated"),
      name: "Unrelated Owner",
    });
    const sharedWorkspace = await createWorkspaceOwner(
      unrelatedOwner.userId,
      "Unrelated Shared",
    );
    await prisma.workspaceMember.create({
      data: {
        workspaceId: sharedWorkspace,
        userId: target.userId,
        role: "MEMBER",
      },
    });

    await deleteUser(target.userId);

    expect(
      await prisma.workspace.findUnique({ where: { id: sharedWorkspace } }),
    ).not.toBeNull();
    expect(
      await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: sharedWorkspace,
            userId: unrelatedOwner.userId,
          },
        },
      }),
    ).not.toBeNull();
    expect(
      await prisma.user.findUnique({
        where: { id: unrelatedOwner.userId },
        select: { deletedAt: true },
      }),
    ).toEqual({ deletedAt: null });
  });

  it("rejects Admin self-targeting even when the client supplies the Admin user id", async () => {
    const admin = await signInAdmin();

    await expect(disableUser(admin.userId)).rejects.toThrow(
      AdminSelfProtectionError,
    );
    await expect(deleteUser(admin.userId)).rejects.toThrow(
      AdminSelfProtectionError,
    );
    await expect(disableUserAction(admin.userId)).resolves.toEqual({
      error: "Admin cannot disable itself.",
    });
    await expect(deleteUserAction(admin.userId)).resolves.toEqual({
      error: "Admin cannot delete itself.",
    });

    expect(await prisma.adminAction.count()).toBe(0);
  });
});
