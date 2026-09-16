// tests/unit/application/workspace/get-authorized-workspace.test.ts
import { describe, expect, it } from "vitest";

import { getAuthorizedWorkspace } from "@/application/workspace/get-authorized-workspace";
import type {
  WorkspaceMemberRecord,
  WorkspaceRecord,
} from "@/domain/persistence-types";
import type {
  WorkspaceMemberRepository,
  WorkspaceRepository,
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
  reads: string[] = [],
): WorkspaceRepository {
  return {
    createWorkspace: async () => {
      throw new Error("not used");
    },
    getWorkspaceById: async (workspaceId) => {
      reads.push(workspaceId);
      return lookup(workspaceId);
    },
    updateWorkspace: async () => {
      throw new Error("not used");
    },
  };
}

describe("getAuthorizedWorkspace", () => {
  it("returns the authorized context and workspace for a member", async () => {
    const record = membership({ role: "MEMBER" });
    const workspace = workspaceRecord();

    await expect(
      getAuthorizedWorkspace("user-1", "workspace-owned", {
        members: membersLookingUp((workspaceId, userId) =>
          workspaceId === record.workspaceId && userId === record.userId
            ? record
            : null,
        ),
        workspaces: workspacesLookingUp((workspaceId) =>
          workspaceId === workspace.id ? workspace : null,
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
    });
  });

  it("denies a non-member without reading workspace persistence", async () => {
    const reads: string[] = [];

    await expect(
      getAuthorizedWorkspace("user-1", "workspace-foreign", {
        members: membersLookingUp(() => null),
        workspaces: workspacesLookingUp(() => workspaceRecord(), reads),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);

    expect(reads).toEqual([]);
  });

  it("denies identifier substitution without reading the foreign workspace", async () => {
    const owned = membership();
    const reads: string[] = [];

    await expect(
      getAuthorizedWorkspace("user-1", "workspace-other", {
        members: membersLookingUp((workspaceId, userId) =>
          workspaceId === owned.workspaceId && userId === owned.userId
            ? owned
            : null,
        ),
        workspaces: workspacesLookingUp(
          () => workspaceRecord({ id: "workspace-other", name: "Foreign" }),
          reads,
        ),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);

    expect(reads).toEqual([]);
  });

  it("fails closed when membership exists but the workspace record is missing", async () => {
    const record = membership();

    await expect(
      getAuthorizedWorkspace("user-1", "workspace-owned", {
        members: membersLookingUp(() => record),
        workspaces: workspacesLookingUp(() => null),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);
  });
});
