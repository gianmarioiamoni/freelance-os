// tests/integration/workspace/membership-resolution.test.ts
import { describe, expect, it } from "vitest";

import { requireWorkspaceAccess } from "@/application/workspace/require-workspace-access";
import { resolveWorkspaceContext } from "@/application/workspace/resolve-workspace-context";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

import { repositories } from "../persistence/helpers";

describe("workspace membership resolution", () => {
  it("lists only the requested user's memberships", async () => {
    const workspaceA = await repositories.workspaces.createWorkspace({
      name: "Workspace A",
      timezone: "Europe/Rome",
      currency: "EUR",
    });
    const workspaceB = await repositories.workspaces.createWorkspace({
      name: "Workspace B",
      timezone: "Europe/Rome",
      currency: "EUR",
    });

    await repositories.members.addMember({
      workspaceId: workspaceA.id,
      userId: "user-a",
      role: "OWNER",
    });
    await repositories.members.addMember({
      workspaceId: workspaceA.id,
      userId: "user-b",
      role: "MEMBER",
    });
    await repositories.members.addMember({
      workspaceId: workspaceB.id,
      userId: "user-b",
      role: "OWNER",
    });

    const userAMemberships =
      await repositories.members.listMembershipsByUserId("user-a");
    const userBMemberships =
      await repositories.members.listMembershipsByUserId("user-b");
    const unknownMemberships =
      await repositories.members.listMembershipsByUserId("user-unknown");

    expect(userAMemberships).toEqual([
      expect.objectContaining({
        workspaceId: workspaceA.id,
        userId: "user-a",
        role: "OWNER",
      }),
    ]);
    expect(userBMemberships).toHaveLength(2);
    expect(userBMemberships.map((row) => row.workspaceId).sort()).toEqual(
      [workspaceA.id, workspaceB.id].sort(),
    );
    expect(userBMemberships.every((row) => row.userId === "user-b")).toBe(true);
    expect(unknownMemberships).toEqual([]);
  });

  it("authorizes a member and denies a non-member for another workspace", async () => {
    const owned = await repositories.workspaces.createWorkspace({
      name: "Owned Workspace",
      timezone: "Europe/Rome",
      currency: "EUR",
    });
    const foreign = await repositories.workspaces.createWorkspace({
      name: "Foreign Workspace",
      timezone: "Europe/Rome",
      currency: "EUR",
    });

    await repositories.members.addMember({
      workspaceId: owned.id,
      userId: "member-user",
      role: "OWNER",
    });
    await repositories.members.addMember({
      workspaceId: foreign.id,
      userId: "other-user",
      role: "OWNER",
    });

    await expect(
      requireWorkspaceAccess("member-user", owned.id, repositories.members),
    ).resolves.toEqual({
      workspaceId: owned.id,
      userId: "member-user",
      role: "OWNER",
    });

    await expect(
      requireWorkspaceAccess("member-user", foreign.id, repositories.members),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);

    await expect(
      resolveWorkspaceContext("onboarding-user", repositories.members),
    ).resolves.toEqual({ status: "onboarding_required" });

    await expect(
      resolveWorkspaceContext("member-user", repositories.members),
    ).resolves.toEqual({
      status: "resolved",
      context: {
        workspaceId: owned.id,
        userId: "member-user",
        role: "OWNER",
      },
    });
  });
});
