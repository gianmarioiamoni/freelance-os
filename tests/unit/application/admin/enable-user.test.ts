// tests/unit/application/admin/enable-user.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/infrastructure/prisma/client";
import { enableUser } from "@/application/admin/enable-user";
import {
  UserDeletedError,
  UserNotDisabledError,
  UserNotFoundError,
} from "@/application/admin/user-lifecycle-errors";
import * as adminAuth from "@/application/admin/admin-authorization";
import * as recordAdminAction from "@/application/admin/record-admin-action";
import { mockPrismaTransactionAsPassthrough } from "./mock-prisma-transaction";

vi.mock("@/application/admin/admin-authorization");

describe("enableUser", () => {
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
  });

  it("should enable a disabled user", async () => {
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
    const updateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({
      ...mockUser,
      disabledAt: null,
    });

    await enableUser(mockTargetUserId);

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: mockTargetUserId },
      data: { disabledAt: null },
    });
    expect(recordAdminAction.recordAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      {
        adminUserId: mockAdminUserId,
        targetUserId: mockTargetUserId,
        action: "ENABLE_USER",
      },
    );
  });

  it("should throw UserNotFoundError when user does not exist", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    await expect(enableUser(mockTargetUserId)).rejects.toThrow(
      UserNotFoundError,
    );
    expect(recordAdminAction.recordAdminAction).not.toHaveBeenCalled();
  });

  it("should throw UserDeletedError when user is deleted", async () => {
    const mockUser = {
      id: mockTargetUserId,
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      disabledAt: new Date(),
      deletedAt: new Date(),
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

    await expect(enableUser(mockTargetUserId)).rejects.toThrow(UserDeletedError);
    expect(recordAdminAction.recordAdminAction).not.toHaveBeenCalled();
  });

  it("should throw UserNotDisabledError when user is not disabled", async () => {
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

    await expect(enableUser(mockTargetUserId)).rejects.toThrow(
      UserNotDisabledError,
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
      disabledAt: new Date(),
      deletedAt: null,
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);
    vi.spyOn(prisma.user, "update").mockResolvedValue({
      ...mockUser,
      disabledAt: null,
    });

    await enableUser(mockTargetUserId);

    expect(adminAuth.requireAdminAuthorization).toHaveBeenCalled();
  });
});
