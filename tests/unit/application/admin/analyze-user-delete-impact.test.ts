// tests/unit/application/admin/analyze-user-delete-impact.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/infrastructure/prisma/client";
import { analyzeUserDeleteImpact } from "@/application/admin/analyze-user-delete-impact";
import {
  AdminSelfProtectionError,
  UserAlreadyDeletedError,
  UserNotFoundError,
} from "@/application/admin/user-lifecycle-errors";
import * as adminAuth from "@/application/admin/admin-authorization";

vi.mock("@/application/admin/admin-authorization");

describe("analyzeUserDeleteImpact", () => {
  const mockAdminUserId = "admin-123";
  const mockTargetUserId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: mockAdminUserId,
      email: "admin@example.com",
    });
  });

  it("should throw AdminSelfProtectionError when admin analyzes itself", async () => {
    await expect(analyzeUserDeleteImpact(mockAdminUserId)).rejects.toThrow(
      AdminSelfProtectionError,
    );
  });

  it("should throw UserNotFoundError when user does not exist", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    await expect(analyzeUserDeleteImpact(mockTargetUserId)).rejects.toThrow(
      UserNotFoundError,
    );
  });

  it("should throw UserAlreadyDeletedError when user is deleted", async () => {
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

    await expect(analyzeUserDeleteImpact(mockTargetUserId)).rejects.toThrow(
      UserAlreadyDeletedError,
    );
  });

  it("should require admin authorization", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    await expect(analyzeUserDeleteImpact(mockTargetUserId)).rejects.toThrow(
      UserNotFoundError,
    );
    expect(adminAuth.requireAdminAuthorization).toHaveBeenCalled();
  });
});
