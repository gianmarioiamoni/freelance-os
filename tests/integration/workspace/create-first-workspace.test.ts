// tests/integration/workspace/create-first-workspace.test.ts
import { describe, expect, it } from "vitest";

import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import { resolveWorkspaceContext } from "@/application/workspace/resolve-workspace-context";
import { FirstWorkspaceAlreadyExistsError } from "@/domain/workspace-errors";

import { prisma, repositories, runInTransaction } from "../persistence/helpers";

const creationInput = {
  name: "Studio Iamoni",
  timezone: "Europe/Rome",
  currency: "EUR",
};

describe("createFirstWorkspace", () => {
  it("creates workspace, OWNER membership, and settings in one transaction", async () => {
    const created = await createFirstWorkspace("auth-user-1", creationInput, {
      runInTransaction,
    });

    expect(await prisma.workspace.count()).toBe(1);
    expect(await prisma.workspaceMember.count()).toBe(1);
    expect(await prisma.workspaceSettings.count()).toBe(1);

    expect(created.workspace).toMatchObject(creationInput);
    expect(created.membership).toMatchObject({
      workspaceId: created.workspace.id,
      userId: "auth-user-1",
      role: "OWNER",
    });
    expect(created.settings).toMatchObject({
      workspaceId: created.workspace.id,
      timezone: "Europe/Rome",
      currency: "EUR",
      contractWarningPercent: 80,
      monthlyCapacityWarningPercent: 80,
    });
    expect(created.context).toEqual({
      workspaceId: created.workspace.id,
      userId: "auth-user-1",
      role: "OWNER",
    });

    await expect(
      resolveWorkspaceContext("auth-user-1", repositories.members),
    ).resolves.toEqual({
      status: "resolved",
      context: created.context,
    });
  });

  it("rejects a second first-workspace attempt for the same user", async () => {
    await createFirstWorkspace("auth-user-1", creationInput, {
      runInTransaction,
    });

    await expect(
      createFirstWorkspace(
        "auth-user-1",
        {
          name: "Another Studio",
          timezone: "Europe/Rome",
          currency: "EUR",
        },
        { runInTransaction },
      ),
    ).rejects.toBeInstanceOf(FirstWorkspaceAlreadyExistsError);

    expect(await prisma.workspace.count()).toBe(1);
    expect(await prisma.workspaceMember.count()).toBe(1);
    expect(await prisma.workspaceSettings.count()).toBe(1);
    expect(await prisma.workspace.findMany()).toEqual([
      expect.objectContaining({ name: "Studio Iamoni" }),
    ]);
  });

  it("rolls back all records when a write inside creation fails", async () => {
    await expect(
      createFirstWorkspace("auth-user-1", creationInput, {
        runInTransaction: async (work) =>
          runInTransaction(async (tx) =>
            work({
              ...tx,
              settings: {
                ...tx.settings,
                putSettings: async () => {
                  throw new Error("forced settings failure");
                },
              },
            }),
          ),
      }),
    ).rejects.toThrow("forced settings failure");

    expect(await prisma.workspace.count()).toBe(0);
    expect(await prisma.workspaceMember.count()).toBe(0);
    expect(await prisma.workspaceSettings.count()).toBe(0);
  });
});
