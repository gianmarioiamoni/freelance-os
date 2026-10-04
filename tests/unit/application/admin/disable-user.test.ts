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
import * as recordAdminAction from "@/application/admin/record-admin-action";
import { mockPrismaTransactionAsPassthrough } from "./mock-prisma-transaction";

vi.mock("@/application/admin/admin-authorization");

describe("disableUser", () => {
  const mockAdminUserId = "admin-123";
  const mockTargetUserId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaTransactionAsPassthrough();
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: mockAdminUserId,
      email: "admin@example.com",
    });
    vi.spyOn(recordAdminAction, "recordAdminAction").mockResolvedValue();
    vi.spyOn(prisma.session, "deleteMany").mockResolvedValue({ count: 0 });
  });

  it("should disable an active user", async () => {
    const mockUser = {
      id: mockTargetUserId,
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      disabledAt: null,
      deletedAt: null,
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);
    const updateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({
      ...mockUser,
      disabledAt: new Date(),
    });

    await disableUser(mockTargetUserId);

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: mockTargetUserId },
      data: { disabledAt: expect.any(Date) },
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: mockTargetUserId },
    });
    expect(recordAdminAction.recordAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      {
        adminUserId: mockAdminUserId,
        targetUserId: mockTargetUserId,
        action: "DISABLE_USER",
      },
    );
  });

  it("should throw AdminSelfProtectionError when admin tries to disable itself", async () => {
    await expect(disableUser(mockAdminUserId)).rejects.toThrow(
      AdminSelfProtectionError,
    );
    await expect(disableUser(mockAdminUserId)).rejects.toThrow(
      "Admin cannot disable itself",
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("should throw UserNotFoundError when user does not exist", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    await expect(disableUser(mockTargetUserId)).rejects.toThrow(
      UserNotFoundError,
    );
    expect(recordAdminAction.recordAdminAction).not.toHaveBeenCalled();
  });

  it("should throw UserAlreadyDeletedError when user is deleted", async () => {
    const mockUser = {
      id: mockTargetUserId,
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      disabledAt: null,
      deletedAt: new Date(),
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

    await expect(disableUser(mockTargetUserId)).rejects.toThrow(
      UserAlreadyDeletedError,
    );
    expect(recordAdminAction.recordAdminAction).not.toHaveBeenCalled();
  });

  it("should throw UserAlreadyDisabledError when user is already disabled", async () => {
    const mockUser = {
      id: mockTargetUserId,
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      disabledAt: new Date(),
      deletedAt: null,
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

    await expect(disableUser(mockTargetUserId)).rejects.toThrow(
      UserAlreadyDisabledError,
    );
    expect(recordAdminAction.recordAdminAction).not.toHaveBeenCalled();
  });

  it("should require admin authorization", async () => {
    const mockUser = {
      id: mockTargetUserId,
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      disabledAt: null,
      deletedAt: null,
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);
    vi.spyOn(prisma.user, "update").mockResolvedValue({
      ...mockUser,
      disabledAt: new Date(),
    });

    await disableUser(mockTargetUserId);

    expect(adminAuth.requireAdminAuthorization).toHaveBeenCalled();
  });
});
