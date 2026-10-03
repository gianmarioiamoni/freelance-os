// tests/integration/admin/authentication-lifecycle.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/infrastructure/prisma/client";

describe("User Lifecycle Database State", () => {
  let testUserId: string;

  beforeEach(async () => {
    testUserId = `test-auth-user-${Date.now()}`;

    await prisma.user.create({
      data: {
        id: testUserId,
        name: "Test Auth User",
        email: `authtest-${testUserId}@example.com`,
      },
    });
  });

  afterEach(async () => {
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

  it("should persist disabledAt when user is disabled", async () => {
    const now = new Date();
    await prisma.user.update({
      where: { id: testUserId },
      data: { disabledAt: now },
    });

    const user = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { disabledAt: true },
    });

    expect(user?.disabledAt).toEqual(now);
  });

  it("should persist deletedAt when user is deleted", async () => {
    const now = new Date();
    await prisma.user.update({
      where: { id: testUserId },
      data: { deletedAt: now },
    });

    const user = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { deletedAt: true },
    });

    expect(user?.deletedAt).toEqual(now);
  });

  it("should allow both disabledAt and deletedAt to be set", async () => {
    const disabledTime = new Date();
    const deletedTime = new Date(disabledTime.getTime() + 1000);

    await prisma.user.update({
      where: { id: testUserId },
      data: { 
        disabledAt: disabledTime,
        deletedAt: deletedTime,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { disabledAt: true, deletedAt: true },
    });

    expect(user?.disabledAt).toEqual(disabledTime);
    expect(user?.deletedAt).toEqual(deletedTime);
  });
});
