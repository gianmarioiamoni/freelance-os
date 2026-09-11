// tests/integration/persistence/transactions.test.ts
import { describe, expect, it } from "vitest";

import { repositories, runInTransaction } from "./helpers";

describe("runInTransaction", () => {
  it("commits when every operation succeeds", async () => {
    const workspace = await runInTransaction(async (tx) => {
      const created = await tx.workspaces.createWorkspace({
        name: "Transactional Workspace",
        timezone: "Europe/Rome",
        currency: "EUR",
      });

      await tx.settings.putSettings(created.id, {
        timezone: "Europe/Rome",
        currency: "EUR",
        contractWarningPercent: 80,
        monthlyCapacityWarningPercent: 80,
      });

      return created;
    });

    expect(await repositories.workspaces.getWorkspaceById(workspace.id)).toMatchObject({
      name: "Transactional Workspace",
    });
    expect(await repositories.settings.getSettings(workspace.id)).toMatchObject({
      contractWarningPercent: 80,
    });
  });

  it("rolls back when an operation fails", async () => {
    const createdIds: string[] = [];

    await expect(
      runInTransaction(async (tx) => {
        const created = await tx.workspaces.createWorkspace({
          name: "Rolled Back Workspace",
          timezone: "Europe/Rome",
          currency: "EUR",
        });
        createdIds.push(created.id);
        throw new Error("forced transaction failure");
      }),
    ).rejects.toThrow("forced transaction failure");

    expect(createdIds).toHaveLength(1);
    expect(await repositories.workspaces.getWorkspaceById(createdIds[0] ?? "")).toBeNull();
  });
});
