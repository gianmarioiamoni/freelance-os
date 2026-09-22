// tests/unit/application/workspace/create-first-workspace.test.ts
import { describe, expect, it } from "vitest";

import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type {
  WorkspaceMemberRecord,
  WorkspaceRecord,
  WorkspaceSettingsRecord,
} from "@/domain/persistence-types";
import type { PersistenceRepositories } from "@/domain/repositories";
import { FirstWorkspaceAlreadyExistsError } from "@/domain/workspace-errors";

function unused(): never {
  throw new Error("not used");
}

function createMemoryDependencies(
  existingMemberships: WorkspaceMemberRecord[] = [],
) {
  const workspaces: WorkspaceRecord[] = [];
  const members: WorkspaceMemberRecord[] = [...existingMemberships];
  const settings: WorkspaceSettingsRecord[] = [];
  let transactionInvoked = false;

  const repositories: PersistenceRepositories = {
    workspaces: {
      async createWorkspace(input) {
        const record: WorkspaceRecord = {
          id: `workspace-${workspaces.length + 1}`,
          name: input.name,
          timezone: input.timezone,
          currency: input.currency,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        };
        workspaces.push(record);
        return record;
      },
      getWorkspaceById: unused,
      updateWorkspace: unused,
    },
    members: {
      async addMember(input) {
        const record: WorkspaceMemberRecord = {
          ...input,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        };
        members.push(record);
        return record;
      },
      getMember: unused,
      listMembers: unused,
      async listMembershipsByUserId(userId) {
        return members.filter((row) => row.userId === userId);
      },
    },
    settings: {
      getSettings: unused,
      async putSettings(workspaceId, input) {
        const record: WorkspaceSettingsRecord = {
          workspaceId,
          ...input,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        };
        settings.push(record);
        return record;
      },
    },
    clients: {
      createClient: unused,
      getClient: unused,
      listClients: unused,
      updateClient: unused,
      archiveClient: unused,
    },
    contracts: {
      createContract: unused,
      getContract: unused,
      listContracts: unused,
      listContractsForClient: unused,
      updateContract: unused,
      findContractCoveringDate: unused,
    },
    invoices: {
      createInvoice: unused,
      getInvoice: unused,
      listInvoicesForContract: unused,
      updateInvoice: unused,
      voidInvoice: unused,
      existsForContract: unused,
    },
    timeEntries: {
      recordTimeEntry: unused,
      getTimeEntry: unused,
      listTimeEntriesForDate: unused,
      listTimeEntriesForPeriod: unused,
      updateTimeEntry: unused,
      deleteTimeEntry: unused,
    },
    alerts: {
      createAlert: unused,
      getAlert: unused,
      findAlertByDeduplicationKey: unused,
      findActiveAlertByContractAndType: unused,
      resolveAlert: unused,
    },
    notifications: {
      createNotification: unused,
      getNotification: unused,
      listNotificationsForUser: unused,
      markNotificationRead: unused,
      countUnreadNotificationsForUser: unused,
    },
    analytics: {
      getMonthlyAnalytics: unused,
      getDailyAnalytics: unused,
      getClientAllocations: unused,
      getContractUtilizations: unused,
      listTimeEntriesForPeriod: unused,
      listExpectedContracts: unused,
    },
  };

  return {
    workspaces,
    members,
    settings,
    wasTransactionInvoked: () => transactionInvoked,
    dependencies: {
      runInTransaction: async <T>(
        work: (repositories: PersistenceRepositories) => Promise<T>,
      ) => {
        transactionInvoked = true;
        return work(repositories);
      },
    },
  };
}

describe("createFirstWorkspace", () => {
  it("allows an eligible user to create a first workspace as OWNER", async () => {
    const memory = createMemoryDependencies();

    const created = await createFirstWorkspace(
      "user-1",
      {
        name: "  Studio Iamoni  ",
        timezone: "Europe/Rome",
        currency: "eur",
      },
      memory.dependencies,
    );

    expect(memory.wasTransactionInvoked()).toBe(true);
    expect(created.workspace).toMatchObject({
      id: "workspace-1",
      name: "Studio Iamoni",
      timezone: "Europe/Rome",
      currency: "EUR",
    });
    expect(created.membership).toMatchObject({
      workspaceId: "workspace-1",
      userId: "user-1",
      role: "OWNER",
    });
    expect(created.settings).toMatchObject({
      workspaceId: "workspace-1",
      timezone: "Europe/Rome",
      currency: "EUR",
      contractWarningPercent: 80,
      monthlyCapacityWarningPercent: 80,
    });
    expect(created.context).toEqual({
      workspaceId: "workspace-1",
      userId: "user-1",
      role: "OWNER",
      timezone: "Europe/Rome",
    });
  });

  it("rejects a user who already has a membership", async () => {
    const memory = createMemoryDependencies([
      {
        workspaceId: "workspace-existing",
        userId: "user-1",
        role: "MEMBER",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    await expect(
      createFirstWorkspace(
        "user-1",
        {
          name: "Second Workspace",
          timezone: "Europe/Rome",
          currency: "EUR",
        },
        memory.dependencies,
      ),
    ).rejects.toBeInstanceOf(FirstWorkspaceAlreadyExistsError);

    expect(memory.workspaces).toEqual([]);
    expect(memory.settings).toEqual([]);
    expect(memory.members).toHaveLength(1);
  });
});
