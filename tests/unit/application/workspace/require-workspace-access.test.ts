// tests/unit/application/workspace/require-workspace-access.test.ts
import { describe, expect, it } from "vitest";

import { requireWorkspaceAccess } from "@/application/workspace/require-workspace-access";
import type { WorkspaceMemberRecord } from "@/domain/persistence-types";
import type { WorkspaceMemberRepository } from "@/domain/repositories";
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

describe("requireWorkspaceAccess", () => {
  it("returns the authorized context for a valid membership", async () => {
    const record = membership({ role: "MEMBER" });
    const members = membersLookingUp((workspaceId, userId) =>
      workspaceId === record.workspaceId && userId === record.userId
        ? record
        : null,
    );

    await expect(
      requireWorkspaceAccess("user-1", "workspace-owned", members),
    ).resolves.toEqual({
      workspaceId: "workspace-owned",
      userId: "user-1",
      role: "MEMBER",
    });
  });

  it("denies a user who is not a member of the requested workspace", async () => {
    const members = membersLookingUp(() => null);

    await expect(
      requireWorkspaceAccess("user-1", "workspace-foreign", members),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);
  });

  it("denies identifier substitution of an unauthorized workspace", async () => {
    const owned = membership();
    const members = membersLookingUp((workspaceId, userId) =>
      workspaceId === owned.workspaceId && userId === owned.userId ? owned : null,
    );

    await expect(
      requireWorkspaceAccess("user-1", "workspace-other", members),
    ).rejects.toSatisfy((error: unknown) => {
      return (
        error instanceof UnauthorizedWorkspaceAccessError &&
        error.message === "Unauthorized workspace access"
      );
    });
  });
});
