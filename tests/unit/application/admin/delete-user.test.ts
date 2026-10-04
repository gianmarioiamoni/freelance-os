// tests/unit/application/admin/delete-user.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/infrastructure/prisma/client";
import { deleteUser } from "@/application/admin/delete-user";
import {
  AdminSelfProtectionError,
  UserAlreadyDeletedError,
  UserNotFoundError,
} from "@/application/admin/user-lifecycle-errors";
import * as adminAuth from "@/application/admin/admin-authorization";
import * as recordAdminAction from "@/application/admin/record-admin-action";
import { mockPrismaTransactionAsPassthrough } from "./mock-prisma-transaction";

vi.mock("@/application/admin/admin-authorization");

describe("deleteUser", () => {
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

  it("should throw AdminSelfProtectionError when admin tries to delete itself", async () => {
    await expect(deleteUser(mockAdminUserId)).rejects.toThrow(
      AdminSelfProtectionError,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(recordAdminAction.recordAdminAction).not.toHaveBeenCalled();
  });

  it("should throw UserNotFoundError when user does not exist", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    await expect(deleteUser(mockTargetUserId)).rejects.toThrow(
      UserNotFoundError,
    );
    expect(recordAdminAction.recordAdminAction).not.toHaveBeenCalled();
  });

  it("should throw UserAlreadyDeletedError when user is already deleted", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: mockTargetUserId,
      name: "Deleted User",
      email: `deleted-user-${mockTargetUserId}@deleted.local`,
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      disabledAt: new Date(),
      deletedAt: new Date(),
    });

    await expect(deleteUser(mockTargetUserId)).rejects.toThrow(
      UserAlreadyDeletedError,
    );
    expect(recordAdminAction.recordAdminAction).not.toHaveBeenCalled();
  });

  it("should require admin authorization", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    await expect(deleteUser(mockTargetUserId)).rejects.toThrow(
      UserNotFoundError,
    );

    expect(adminAuth.requireAdminAuthorization).toHaveBeenCalled();
  });
});
