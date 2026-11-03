// tests/unit/infrastructure/viewer-access-repository.test.ts
import { describe, expect, it } from "vitest";
import type { PrismaClient, TimesheetViewerAccess, Prisma } from "@prisma/client";
import { createViewerAccessRepository } from "@/infrastructure/persistence/viewer-access-repository";

type FindManyArgs = Prisma.TimesheetViewerAccessFindManyArgs;

function createMockPrisma(): PrismaClient {
  return {
    timesheetViewerAccess: {
      findMany: async () => [] as TimesheetViewerAccess[],
    },
  } as unknown as PrismaClient;
}

describe("ViewerAccessRepository.findActiveByEmail", () => {
  it("finds active viewer access by email", async () => {
    const email = "viewer@example.com";
    const mockViewerAccess: TimesheetViewerAccess = {
      id: "viewer-1",
      workspaceId: "ws-1",
      userId: "user-1",
      email: email.toLowerCase(),
      status: "ACTIVE",
      invitedAt: new Date(),
      activatedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prisma = createMockPrisma();
    prisma.timesheetViewerAccess.findMany = async (args?: FindManyArgs) => {
      expect(args?.where?.email).toBe(email.toLowerCase());
      expect(args?.where?.status).toBe("ACTIVE");
      return [mockViewerAccess] as TimesheetViewerAccess[];
    };

    const repository = createViewerAccessRepository(prisma);
    const result = await repository.findActiveByEmail(email);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("viewer-1");
    expect(result[0]?.status).toBe("ACTIVE");
  });

  it("returns empty array for email with no active access", async () => {
    const prisma = createMockPrisma();
    prisma.timesheetViewerAccess.findMany = async () => [] as TimesheetViewerAccess[];

    const repository = createViewerAccessRepository(prisma);
    const result = await repository.findActiveByEmail("nonexistent@example.com");

    expect(result).toHaveLength(0);
  });

  it("normalizes email to lowercase", async () => {
    const prisma = createMockPrisma();
    prisma.timesheetViewerAccess.findMany = async (args?: FindManyArgs) => {
      expect(args?.where?.email).toBe("viewer@example.com");
      return [] as TimesheetViewerAccess[];
    };

    const repository = createViewerAccessRepository(prisma);
    await repository.findActiveByEmail("VIEWER@EXAMPLE.COM");
  });

  it("filters only ACTIVE status", async () => {
    const prisma = createMockPrisma();
    prisma.timesheetViewerAccess.findMany = async (args?: FindManyArgs) => {
      expect(args?.where?.status).toBe("ACTIVE");
      return [] as TimesheetViewerAccess[];
    };

    const repository = createViewerAccessRepository(prisma);
    await repository.findActiveByEmail("test@example.com");
  });

  it("returns multiple active accesses for same email across workspaces", async () => {
    const email = "viewer@example.com";
    const mockViewerAccess1: TimesheetViewerAccess = {
      id: "viewer-1",
      workspaceId: "ws-1",
      userId: "user-1",
      email: email.toLowerCase(),
      status: "ACTIVE",
      invitedAt: new Date(),
      activatedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockViewerAccess2: TimesheetViewerAccess = {
      id: "viewer-2",
      workspaceId: "ws-2",
      userId: "user-1",
      email: email.toLowerCase(),
      status: "ACTIVE",
      invitedAt: new Date(),
      activatedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prisma = createMockPrisma();
    prisma.timesheetViewerAccess.findMany = async () => [
      mockViewerAccess1,
      mockViewerAccess2,
    ] as TimesheetViewerAccess[];

    const repository = createViewerAccessRepository(prisma);
    const result = await repository.findActiveByEmail(email);

    expect(result).toHaveLength(2);
    expect(result[0]?.workspaceId).toBe("ws-1");
    expect(result[1]?.workspaceId).toBe("ws-2");
  });
});
