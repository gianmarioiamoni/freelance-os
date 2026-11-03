// tests/unit/application/admin/list-users.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/infrastructure/prisma/client";
import { listUsers } from "@/application/admin/list-users";
import * as adminAuth from "@/application/admin/admin-authorization";

vi.mock("@/application/admin/admin-authorization");

describe("listUsers", () => {
  const mockAdminUserId = "admin-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminAuth.requireAdminAuthorization).mockResolvedValue({
      userId: mockAdminUserId,
      email: "admin@example.com",
    });
  });

  it("should list only freelancer users with admin flag", async () => {
    const mockUsers = [
      {
        id: mockAdminUserId,
        name: "Admin User",
        email: "admin@example.com",
        createdAt: new Date("2024-01-01"),
        disabledAt: null,
        deletedAt: null,
      },
      {
        id: "user-456",
        name: "Regular User",
        email: "user@example.com",
        createdAt: new Date("2024-01-02"),
        disabledAt: null,
        deletedAt: null,
      },
    ];

    vi.spyOn(prisma.workspaceMember, "findMany").mockResolvedValue([
      { userId: mockAdminUserId, workspaceId: "ws-1", role: "OWNER", createdAt: new Date() },
      { userId: "user-456", workspaceId: "ws-1", role: "MEMBER", createdAt: new Date() },
    ]);

    vi.spyOn(prisma.user, "findMany").mockResolvedValue(
      mockUsers.map((u) => ({
        ...u,
        emailVerified: false,
        image: null,
        updatedAt: new Date(),
      })),
    );

    const result = await listUsers();

    expect(result).toHaveLength(2);
    expect(result[0].isAdmin).toBe(true);
    expect(result[1].isAdmin).toBe(false);
  });

  it("should order users by creation date descending", async () => {
    vi.spyOn(prisma.workspaceMember, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.user, "findMany").mockResolvedValue([]);

    await listUsers();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        disabledAt: true,
        deletedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  it("should require admin authorization", async () => {
    vi.spyOn(prisma.workspaceMember, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.user, "findMany").mockResolvedValue([]);

    await listUsers();

    expect(adminAuth.requireAdminAuthorization).toHaveBeenCalled();
  });

  it("should reject unauthorized callers", async () => {
    const { UnauthorizedAdminAccessError } = await import(
      "@/application/admin/admin-errors"
    );
    const userFindMany = vi.spyOn(prisma.user, "findMany");
    const workspaceMemberFindMany = vi.spyOn(prisma.workspaceMember, "findMany");
    vi.mocked(adminAuth.requireAdminAuthorization).mockRejectedValue(
      new UnauthorizedAdminAccessError(),
    );

    await expect(listUsers()).rejects.toThrow(UnauthorizedAdminAccessError);
    expect(workspaceMemberFindMany).not.toHaveBeenCalled();
    expect(userFindMany).not.toHaveBeenCalled();
  });

  it("should exclude viewer-only users", async () => {
    const freelancerId = "freelancer-123";
    const viewerOnlyId = "viewer-only-456";

    vi.spyOn(prisma.workspaceMember, "findMany").mockResolvedValue([
      { userId: freelancerId, workspaceId: "ws-1", role: "MEMBER", createdAt: new Date() },
    ]);

    vi.spyOn(prisma.user, "findMany").mockResolvedValue([
      {
        id: freelancerId,
        name: "Freelancer User",
        email: "freelancer@example.com",
        createdAt: new Date("2024-01-01"),
        disabledAt: null,
        deletedAt: null,
        emailVerified: false,
        image: null,
        updatedAt: new Date(),
      },
    ]);

    const result = await listUsers();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(freelancerId);
    expect(result[0].email).toBe("freelancer@example.com");
  });

  it("should include users with both freelancer and viewer roles", async () => {
    const dualRoleUserId = "dual-789";

    vi.spyOn(prisma.workspaceMember, "findMany").mockResolvedValue([
      { userId: dualRoleUserId, workspaceId: "ws-1", role: "MEMBER", createdAt: new Date() },
    ]);

    vi.spyOn(prisma.user, "findMany").mockResolvedValue([
      {
        id: dualRoleUserId,
        name: "Dual Role User",
        email: "dual@example.com",
        createdAt: new Date("2024-01-01"),
        disabledAt: null,
        deletedAt: null,
        emailVerified: false,
        image: null,
        updatedAt: new Date(),
      },
    ]);

    const result = await listUsers();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(dualRoleUserId);
    expect(result[0].email).toBe("dual@example.com");
  });
});
