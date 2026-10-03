// tests/unit/application/admin/disable-user.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/infrastructure/prisma/client";
import { disableUser } from "@/application/admin/disable-user";
import {
  AdminSelfProtectionError,
  UserAlreadyDeletedError,
  UserAlreadyDisabledError,
  UserNotFoundError,
} from "@/application/admin/user-lifecycle-errors";
import * as adminAuth from "@/application/admin/admin-authorization";

vi.mock("@/application/admin/admin-authorization");

describe("disableUser", () => {
  const mockAdminUserId = "admin-123";
  const mockTargetUserId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: mockAdminUserId,
      email: "admin@example.com",
    });
  });

  it("should disable an active user", async () => {
    const mockUser = {
      id: mockTargetUserId,
      disabledAt: null,
      deletedAt: null,
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);
    const updateSpy = vi
      .spyOn(prisma.user, "update")
      .mockResolvedValue({
        id: mockTargetUserId,
        name: "Test",
        email: "test@example.com",
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        disabledAt: new Date(),
        deletedAt: null,
      });

    await disableUser(mockTargetUserId);

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: mockTargetUserId },
      data: { disabledAt: expect.any(Date) },
    });
  });

  it("should throw AdminSelfProtectionError when admin tries to disable itself", async () => {
    await expect(disableUser(mockAdminUserId)).rejects.toThrow(
      AdminSelfProtectionError,
    );
    await expect(disableUser(mockAdminUserId)).rejects.toThrow(
      "Admin cannot disable itself",
    );
  });

  it("should throw UserNotFoundError when user does not exist", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    await expect(disableUser(mockTargetUserId)).rejects.toThrow(
      UserNotFoundError,
    );
  });

  it("should throw UserAlreadyDeletedError when user is deleted", async () => {
    const mockUser = {
      id: mockTargetUserId,
      disabledAt: null,
      deletedAt: new Date(),
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

    await expect(disableUser(mockTargetUserId)).rejects.toThrow(
      UserAlreadyDeletedError,
    );
  });

  it("should throw UserAlreadyDisabledError when user is already disabled", async () => {
    const mockUser = {
      id: mockTargetUserId,
      disabledAt: new Date(),
      deletedAt: null,
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

    await expect(disableUser(mockTargetUserId)).rejects.toThrow(
      UserAlreadyDisabledError,
    );
  });

  it("should require admin authorization", async () => {
    const mockUser = {
      id: mockTargetUserId,
      disabledAt: null,
      deletedAt: null,
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);
    vi.spyOn(prisma.user, "update").mockResolvedValue({
      id: mockTargetUserId,
      name: "Test",
      email: "test@example.com",
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      disabledAt: new Date(),
      deletedAt: null,
    });

    await disableUser(mockTargetUserId);

    expect(adminAuth.requireAdminAuthorization).toHaveBeenCalled();
  });
});
