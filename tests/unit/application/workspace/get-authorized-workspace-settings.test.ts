// tests/unit/application/workspace/get-authorized-workspace-settings.test.ts
import { describe, expect, it } from "vitest";

import { getAuthorizedWorkspaceSettings } from "@/application/workspace/get-authorized-workspace-settings";
import type {
  WorkspaceMemberRecord,
  WorkspaceRecord,
  WorkspaceSettingsRecord,
} from "@/domain/persistence-types";
import type {
  WorkspaceMemberRepository,
  WorkspaceRepository,
  WorkspaceSettingsRepository,
} from "@/domain/repositories";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

function membership(
  overrides: Partial<WorkspaceMemberRecord> = {},
): WorkspaceMemberRecord {
  return {
    workspaceId: "workspace-owned",
    userId: "user-1",
    role: "OWNER",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function workspaceRecord(
  overrides: Partial<WorkspaceRecord> = {},
): WorkspaceRecord {
  return {
    id: "workspace-owned",
    name: "Owned Studio",
    timezone: "Europe/Rome",
    currency: "EUR",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function settingsRecord(
  overrides: Partial<WorkspaceSettingsRecord> = {},
): WorkspaceSettingsRecord {
  return {
    workspaceId: "workspace-owned",
    timezone: "Europe/Rome",
    currency: "EUR",
    contractWarningPercent: 80,
    monthlyCapacityWarningPercent: 80,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function membersLookingUp(
  lookup: (
    workspaceId: string,
    userId: string,
  ) => WorkspaceMemberRecord | null,
): WorkspaceMemberRepository {
  return {
    addMember: async () => {
      throw new Error("not used");
    },
    getMember: async (workspaceId, userId) => lookup(workspaceId, userId),
    listMembers: async () => [],
    listMembershipsByUserId: async () => [],
  };
}

function workspacesLookingUp(
  lookup: (workspaceId: string) => WorkspaceRecord | null,
): WorkspaceRepository {
  return {
    createWorkspace: async () => {
      throw new Error("not used");
    },
    getWorkspaceById: async (workspaceId) => lookup(workspaceId),
    updateWorkspace: async () => {
      throw new Error("not used");
    },
  };
}

function settingsLookingUp(
  lookup: (workspaceId: string) => WorkspaceSettingsRecord | null,
  reads: string[] = [],
): WorkspaceSettingsRepository {
  return {
    getSettings: async (workspaceId) => {
      reads.push(workspaceId);
      return lookup(workspaceId);
    },
    putSettings: async () => {
      throw new Error("not used");
    },
  };
}

describe("getAuthorizedWorkspaceSettings", () => {
  it("returns the authorized workspace and settings for a member", async () => {
    const record = membership({ role: "MEMBER" });
    const workspace = workspaceRecord();
    const settings = settingsRecord();

    await expect(
      getAuthorizedWorkspaceSettings("user-1", "workspace-owned", {
        members: membersLookingUp((workspaceId, userId) =>
          workspaceId === record.workspaceId && userId === record.userId
            ? record
            : null,
        ),
        workspaces: workspacesLookingUp((workspaceId) =>
          workspaceId === workspace.id ? workspace : null,
        ),
        settings: settingsLookingUp((workspaceId) =>
          workspaceId === settings.workspaceId ? settings : null,
        ),
      }),
    ).resolves.toEqual({
      context: {
        workspaceId: "workspace-owned",
        userId: "user-1",
        role: "MEMBER",
        timezone: "Europe/Rome",
      },
      workspace,
      settings,
    });
  });

  it("denies a non-member without reading settings", async () => {
    const reads: string[] = [];

    await expect(
      getAuthorizedWorkspaceSettings("user-1", "workspace-foreign", {
        members: membersLookingUp(() => null),
        workspaces: workspacesLookingUp(() => workspaceRecord()),
        settings: settingsLookingUp(() => settingsRecord(), reads),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);

    expect(reads).toEqual([]);
  });

  it("denies identifier substitution without reading foreign settings", async () => {
    const owned = membership();
    const reads: string[] = [];

    await expect(
      getAuthorizedWorkspaceSettings("user-1", "workspace-other", {
        members: membersLookingUp((workspaceId, userId) =>
          workspaceId === owned.workspaceId && userId === owned.userId
            ? owned
            : null,
        ),
        workspaces: workspacesLookingUp(() =>
          workspaceRecord({ id: "workspace-other", name: "Foreign" }),
        ),
        settings: settingsLookingUp(
          () => settingsRecord({ workspaceId: "workspace-other" }),
          reads,
        ),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);

    expect(reads).toEqual([]);
  });
});
