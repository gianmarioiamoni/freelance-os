// tests/integration/admin/user-lifecycle.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/infrastructure/prisma/client";
import { disableUser } from "@/application/admin/disable-user";
import { enableUser } from "@/application/admin/enable-user";
import { deleteUser } from "@/application/admin/delete-user";
import { analyzeUserDeleteImpact } from "@/application/admin/analyze-user-delete-impact";
import * as adminAuth from "@/application/admin/admin-authorization";
import {
  AdminSelfProtectionError,
  UserAlreadyDeletedError,
  UserDeletedError,
} from "@/application/admin/user-lifecycle-errors";

vi.mock("@/application/admin/admin-authorization");

describe("User Lifecycle Integration", () => {
  const mockAdminUserId = "test-admin-123";
  let testUserId: string;
  let testWorkspaceId: string;

  beforeAll(async () => {
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: mockAdminUserId,
      email: "admin@test.com",
    });
  });

  beforeEach(async () => {
    testUserId = `test-user-${Date.now()}`;

    await prisma.user.create({
      data: {
        id: testUserId,
        name: "Test User",
        email: `test-${testUserId}@example.com`,
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: "Test Workspace",
        timezone: "UTC",
        currency: "USD",
      },
    });
    testWorkspaceId = workspace.id;

    await prisma.workspaceMember.create({
      data: {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        role: "OWNER",
      },
    });
  });

  afterEach(async () => {
    await prisma.workspaceMember.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.workspace.deleteMany({
      where: { id: testWorkspaceId },
    });
    await prisma.session.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.account.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  describe("disable and enable flow", () => {
    it("should disable and then enable a user", async () => {
      await disableUser(testUserId);

      let user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { disabledAt: true },
      });
      expect(user?.disabledAt).not.toBeNull();

      await enableUser(testUserId);

      user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { disabledAt: true },
      });
      expect(user?.disabledAt).toBeNull();
    });

    it("should preserve workspace membership after disable/enable", async () => {
      await disableUser(testUserId);
      await enableUser(testUserId);

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: testWorkspaceId,
            userId: testUserId,
          },
        },
      });

      expect(membership).not.toBeNull();
    });
  });

  describe("delete with sole owner workspace", () => {
    it("should delete workspace when user is sole owner", async () => {
      await deleteUser(testUserId);

      const workspace = await prisma.workspace.findUnique({
        where: { id: testWorkspaceId },
      });
      expect(workspace).toBeNull();

      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { deletedAt: true, email: true, name: true },
      });
      expect(user?.deletedAt).not.toBeNull();
      expect(user?.email).toBe(`deleted-user-${testUserId}@deleted.local`);
      expect(user?.name).toBe("Deleted User");
    });
  });

  describe("delete with shared ownership", () => {
    let secondOwnerId: string;

    beforeEach(async () => {
      secondOwnerId = `test-owner-2-${Date.now()}`;

      await prisma.user.create({
        data: {
          id: secondOwnerId,
          name: "Second Owner",
          email: `owner2-${secondOwnerId}@example.com`,
        },
      });

      await prisma.workspaceMember.create({
        data: {
          workspaceId: testWorkspaceId,
          userId: secondOwnerId,
          role: "OWNER",
        },
      });
    });

    afterEach(async () => {
      await prisma.workspaceMember.deleteMany({
        where: { userId: secondOwnerId },
      });
      await prisma.session.deleteMany({
        where: { userId: secondOwnerId },
      });
      await prisma.account.deleteMany({
        where: { userId: secondOwnerId },
      });
      await prisma.user.deleteMany({
        where: { id: secondOwnerId },
      });
    });

    it("should preserve workspace when another owner exists", async () => {
      await deleteUser(testUserId);

      const workspace = await prisma.workspace.findUnique({
        where: { id: testWorkspaceId },
      });
      expect(workspace).not.toBeNull();

      const targetMembership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: testWorkspaceId,
            userId: testUserId,
          },
        },
      });
      expect(targetMembership).toBeNull();

      const otherMembership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: testWorkspaceId,
            userId: secondOwnerId,
          },
        },
      });
      expect(otherMembership).not.toBeNull();
    });
  });

  describe("delete impact analysis", () => {
    it("should correctly identify sole owner workspace", async () => {
      const analysis = await analyzeUserDeleteImpact(testUserId);

      expect(analysis.targetUserId).toBe(testUserId);
      expect(analysis.workspaces).toHaveLength(1);
      expect(analysis.workspaces[0].isSoleOwner).toBe(true);
      expect(analysis.workspaces[0].willBeDeleted).toBe(true);
      expect(analysis.canDelete).toBe(true);
    });

    it("should correctly identify shared ownership", async () => {
      const secondOwnerId = `test-owner-3-${Date.now()}`;

      await prisma.user.create({
        data: {
          id: secondOwnerId,
          name: "Third Owner",
          email: `owner3-${secondOwnerId}@example.com`,
        },
      });

      await prisma.workspaceMember.create({
        data: {
          workspaceId: testWorkspaceId,
          userId: secondOwnerId,
          role: "OWNER",
        },
      });

      const analysis = await analyzeUserDeleteImpact(testUserId);

      expect(analysis.workspaces[0].isSoleOwner).toBe(false);
      expect(analysis.workspaces[0].willBeDeleted).toBe(false);

      await prisma.workspaceMember.deleteMany({
        where: { userId: secondOwnerId },
      });
      await prisma.session.deleteMany({
        where: { userId: secondOwnerId },
      });
      await prisma.account.deleteMany({
        where: { userId: secondOwnerId },
      });
      await prisma.user.deleteMany({
        where: { id: secondOwnerId },
      });
    });
  });

  describe("admin self-protection", () => {
    it("should prevent admin from disabling itself", async () => {
      await expect(disableUser(mockAdminUserId)).rejects.toThrow(
        AdminSelfProtectionError,
      );
    });

    it("should prevent admin from deleting itself", async () => {
      await expect(deleteUser(mockAdminUserId)).rejects.toThrow(
        AdminSelfProtectionError,
      );
    });

    it("should prevent admin from analyzing own delete impact", async () => {
      await expect(analyzeUserDeleteImpact(mockAdminUserId)).rejects.toThrow(
        AdminSelfProtectionError,
      );
    });
  });

  describe("deleted user state", () => {
    it("should prevent enabling a deleted user", async () => {
      await deleteUser(testUserId);

      await expect(enableUser(testUserId)).rejects.toThrow(UserDeletedError);
    });

    it("should prevent deleting an already deleted user", async () => {
      await deleteUser(testUserId);

      await expect(deleteUser(testUserId)).rejects.toThrow(
        UserAlreadyDeletedError,
      );
    });
  });
});
