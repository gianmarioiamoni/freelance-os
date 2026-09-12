// tests/unit/application/workspace/resolve-workspace-context.test.ts
import { describe, expect, it } from "vitest";

import { resolveWorkspaceContext } from "@/application/workspace/resolve-workspace-context";
import type { WorkspaceMemberRecord } from "@/domain/persistence-types";
import type { WorkspaceMemberRepository } from "@/domain/repositories";

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

describe("resolveWorkspaceContext", () => {
  it("returns onboarding required when the user has no memberships", async () => {
    await expect(
      resolveWorkspaceContext("user-1", membersWith([])),
    ).resolves.toEqual({ status: "onboarding_required" });
  });

  it("resolves the single membership into a workspace context", async () => {
    const record = membership({ role: "MEMBER" });

    await expect(
      resolveWorkspaceContext("user-1", membersWith([record])),
    ).resolves.toEqual({
      status: "resolved",
      context: {
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "MEMBER",
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
      ),
    ).resolves.toEqual({ status: "ambiguous_membership" });
  });
});
