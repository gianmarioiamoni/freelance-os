// tests/unit/application/workspace/resolve-workspace-context.test.ts
import { describe, expect, it } from "vitest";

import { resolveWorkspaceContext } from "@/application/workspace/resolve-workspace-context";
import type { WorkspaceMemberRecord, WorkspaceRecord } from "@/domain/persistence-types";
import type { WorkspaceMemberRepository, WorkspaceRepository } from "@/domain/repositories";

function membership(
  overrides: Partial<WorkspaceMemberRecord> = {},
): WorkspaceMemberRecord {
  return {
    workspaceId: "workspace-1",
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
    id: "workspace-1",
    name: "Test Studio",
    timezone: "Europe/Rome",
    currency: "EUR",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function membersWith(
  memberships: WorkspaceMemberRecord[],
): WorkspaceMemberRepository {
  return {
    addMember: async () => {
      throw new Error("not used");
    },
    getMember: async () => null,
    listMembers: async () => [],
    listMembershipsByUserId: async () => memberships,
  };
}

function workspacesWith(
  workspaces: WorkspaceRecord[],
): WorkspaceRepository {
  return {
    createWorkspace: async () => {
      throw new Error("not used");
    },
    getWorkspaceById: async (workspaceId) =>
      workspaces.find((w) => w.id === workspaceId) ?? null,
    updateWorkspace: async () => {
      throw new Error("not used");
    },
  };
}

describe("resolveWorkspaceContext", () => {
  it("returns onboarding required when the user has no memberships", async () => {
    await expect(
      resolveWorkspaceContext("user-1", membersWith([]), workspacesWith([])),
    ).resolves.toEqual({ status: "onboarding_required" });
  });

  it("resolves the single membership into a workspace context with timezone", async () => {
    const record = membership({ role: "MEMBER" });
    const ws = workspaceRecord({ timezone: "America/New_York" });

    await expect(
      resolveWorkspaceContext("user-1", membersWith([record]), workspacesWith([ws])),
    ).resolves.toEqual({
      status: "resolved",
      context: {
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "MEMBER",
        timezone: "America/New_York",
      },
    });
  });

  it("defaults timezone to UTC when workspace record is missing", async () => {
    const record = membership({ role: "MEMBER" });

    await expect(
      resolveWorkspaceContext("user-1", membersWith([record]), workspacesWith([])),
    ).resolves.toEqual({
      status: "resolved",
      context: {
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "MEMBER",
        timezone: "UTC",
      },
    });
  });

  it("fails closed when multiple memberships exist", async () => {
    await expect(
      resolveWorkspaceContext(
        "user-1",
        membersWith([
          membership(),
          membership({ workspaceId: "workspace-2", role: "MEMBER" }),
        ]),
        workspacesWith([workspaceRecord()]),
      ),
    ).resolves.toEqual({ status: "ambiguous_membership" });
  });
});
