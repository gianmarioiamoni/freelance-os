// tests/integration/admin/authentication-lifecycle.test.ts
import * as adminAuth from "@/application/admin/admin-authorization";
import { deleteUser } from "@/application/admin/delete-user";
import { disableUser } from "@/application/admin/disable-user";
import { enableUser } from "@/application/admin/enable-user";
import {
  AdminSelfProtectionError,
  UserAlreadyDeletedError,
  UserDeletedError,
} from "@/application/admin/user-lifecycle-errors";
import { getAuthSessionFromHeaders } from "@/infrastructure/auth/session";
import { prisma } from "@/infrastructure/prisma/client";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  TEST_PASSWORD,
  auth,
  countSessionsForUser,
  registerUser,
  signInHeaders,
  uniqueEmail,
} from "../auth/helpers";

async function expectSignInRejected(email: string): Promise<void> {
  await expect(
    auth.api.signInEmail({
      body: {
        email,
        password: TEST_PASSWORD,
      },
    }),
  ).rejects.toThrow();
}

vi.mock("@/application/admin/admin-authorization");

describe("Authentication lifecycle", () => {
  const mockAdminUserId = "auth-lifecycle-admin";

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

  it("ACTIVE users can authenticate, DISABLED users cannot, ENABLE restores access", async () => {
    const email = uniqueEmail("auth-active");
    const { userId } = await registerUser({ email, name: "Lifecycle User" });
    const activeHeaders = await signInHeaders({ email });

    expect(await getAuthSessionFromHeaders(activeHeaders)).not.toBeNull();

    await disableUser(userId);

    expect(await getAuthSessionFromHeaders(activeHeaders)).toBeNull();
    expect(await countSessionsForUser(userId)).toBe(0);

    const disabledSignIn = await signInHeaders({ email });
    expect(await getAuthSessionFromHeaders(disabledSignIn)).toBeNull();

    await enableUser(userId);

    const enabledHeaders = await signInHeaders({ email });
    expect(await getAuthSessionFromHeaders(enabledHeaders)).not.toBeNull();
  });

  it("DELETED users cannot authenticate, be enabled, or be deleted again", async () => {
    const email = uniqueEmail("auth-deleted");
    const { userId } = await registerUser({ email, name: "Delete Lifecycle" });
    const headers = await signInHeaders({ email });

    expect(await getAuthSessionFromHeaders(headers)).not.toBeNull();

    await deleteUser(userId);

    expect(await getAuthSessionFromHeaders(headers)).toBeNull();
    expect(await countSessionsForUser(userId)).toBe(0);
    await expectSignInRejected(email);
    await expect(enableUser(userId)).rejects.toThrow(UserDeletedError);
    await expect(deleteUser(userId)).rejects.toThrow(UserAlreadyDeletedError);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true, email: true },
    });
    expect(user?.deletedAt).not.toBeNull();
    expect(user?.email).toBe(`deleted-user-${userId}@deleted.local`);
  });

  it("DISABLED then DELETED users cannot authenticate", async () => {
    const email = uniqueEmail("auth-disabled-deleted");
    const { userId } = await registerUser({ email });

    await disableUser(userId);
    await deleteUser(userId);

    await expectSignInRejected(email);
  });

  it("protects the Admin from self-disable and self-delete", async () => {
    await expect(disableUser(mockAdminUserId)).rejects.toThrow(
      AdminSelfProtectionError,
    );
    await expect(deleteUser(mockAdminUserId)).rejects.toThrow(
      AdminSelfProtectionError,
    );
  });
});
