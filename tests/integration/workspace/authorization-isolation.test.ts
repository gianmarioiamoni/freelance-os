// tests/integration/workspace/authorization-isolation.test.ts
import { describe, expect, it } from "vitest";

import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import { getAuthorizedWorkspace } from "@/application/workspace/get-authorized-workspace";
import { requireWorkspaceAccess } from "@/application/workspace/require-workspace-access";
import { resolveWorkspaceContext } from "@/application/workspace/resolve-workspace-context";
import { getWorkspaceBoundaryRedirect } from "@/application/workspace/workspace-route-access";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import { getAuthSessionFromHeaders } from "@/infrastructure/auth/session";

import { registerUser, signInHeaders, uniqueEmail } from "../auth/helpers";
import { repositories, runInTransaction } from "../persistence/helpers";

const workspaceAInput = {
  name: "Workspace A",
  timezone: "Europe/Rome",
  currency: "EUR",
};

const workspaceBInput = {
  name: "Workspace B",
  timezone: "Europe/Berlin",
  currency: "USD",
};

async function sessionUserId(prefix: string): Promise<string> {
  const email = uniqueEmail(prefix);
  const { userId } = await registerUser({ email });
  const session = await getAuthSessionFromHeaders(
    await signInHeaders({ email }),
  );

  if (!session) {
    throw new Error("expected an authenticated session");
  }

  expect(session.user.id).toBe(userId);
  return session.user.id;
}

async function createIsolatedTenants() {
  const userA = await sessionUserId("iso-a");
  const userB = await sessionUserId("iso-b");
  const workspaceA = await createFirstWorkspace(userA, workspaceAInput, {
    runInTransaction,
  });
  const workspaceB = await createFirstWorkspace(userB, workspaceBInput, {
    runInTransaction,
  });

  return { userA, userB, workspaceA, workspaceB };
}

const authorizedRead = {
  members: repositories.members,
  workspaces: repositories.workspaces,
};

describe("workspace authorization and isolation", () => {
  it("allows a member to obtain authorized access with the attached role", async () => {
    const ownerId = await sessionUserId("owner-a");
    const memberId = await sessionUserId("member-a");
    const created = await createFirstWorkspace(ownerId, workspaceAInput, {
      runInTransaction,
    });

    await repositories.members.addMember({
      workspaceId: created.workspace.id,
      userId: memberId,
      role: "MEMBER",
    });

    await expect(
      requireWorkspaceAccess(
        ownerId,
        created.workspace.id,
        repositories.members,
        repositories.workspaces,
      ),
    ).resolves.toEqual({
      workspaceId: created.workspace.id,
      userId: ownerId,
      role: "OWNER",
      timezone: expect.any(String),
    });

    await expect(
      requireWorkspaceAccess(
        memberId,
        created.workspace.id,
        repositories.members,
        repositories.workspaces,
      ),
    ).resolves.toEqual({
      workspaceId: created.workspace.id,
      userId: memberId,
      role: "MEMBER",
      timezone: expect.any(String),
    });
  });

  it("denies a session user who is not a member of another workspace", async () => {
    const { userA, workspaceB } = await createIsolatedTenants();

    await expect(
      requireWorkspaceAccess(userA, workspaceB.workspace.id, repositories.members),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);
  });

  it("denies identifier substitution of another workspace id", async () => {
    const { userA, workspaceA, workspaceB } = await createIsolatedTenants();

    expect(workspaceB.workspace.id).not.toBe(workspaceA.workspace.id);

    await expect(
      requireWorkspaceAccess(userA, workspaceB.workspace.id, repositories.members),
    ).rejects.toSatisfy((error: unknown) => {
      return (
        error instanceof UnauthorizedWorkspaceAccessError &&
        error.message === "Unauthorized workspace access"
      );
    });
  });

  it("cannot read another workspace through an authorized workspace operation", async () => {
    const { userA, workspaceA, workspaceB } = await createIsolatedTenants();

    const authorized = await getAuthorizedWorkspace(
      userA,
      workspaceA.workspace.id,
      authorizedRead,
    );

    expect(authorized.context).toEqual({
      workspaceId: workspaceA.workspace.id,
      userId: userA,
      role: "OWNER",
      timezone: expect.any(String),
    });
    expect(authorized.workspace).toMatchObject({
      id: workspaceA.workspace.id,
      name: "Workspace A",
    });

    expect(
      await repositories.workspaces.getWorkspaceById(workspaceB.workspace.id),
    ).toMatchObject({
      id: workspaceB.workspace.id,
      name: "Workspace B",
    });

    await expect(
      getAuthorizedWorkspace(userA, workspaceB.workspace.id, authorizedRead),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);
  });

  it("fails closed when more than one membership exists", async () => {
    const userId = await sessionUserId("multi");
    await createFirstWorkspace(userId, workspaceAInput, { runInTransaction });
    const extra = await repositories.workspaces.createWorkspace(workspaceBInput);

    await repositories.members.addMember({
      workspaceId: extra.id,
      userId,
      role: "MEMBER",
    });

    const resolution = await resolveWorkspaceContext(
      userId,
      repositories.members,
      repositories.workspaces,
    );

    expect(resolution).toEqual({ status: "ambiguous_membership" });
    expect(resolution).not.toHaveProperty("context");
    expect(getWorkspaceBoundaryRedirect("/", resolution)).toBe(
      "/workspace-unavailable",
    );
    expect(getWorkspaceBoundaryRedirect("/clients", resolution)).toBe(
      "/workspace-unavailable",
    );
    expect(getWorkspaceBoundaryRedirect("/onboarding", resolution)).toBe(
      "/workspace-unavailable",
    );
  });

  it("requires onboarding and denies workspace access when the user has no memberships", async () => {
    const userId = await sessionUserId("zero");
    const foreign = await createFirstWorkspace(
      await sessionUserId("foreign-owner"),
      workspaceBInput,
      { runInTransaction },
    );

    const resolution = await resolveWorkspaceContext(
      userId,
      repositories.members,
      repositories.workspaces,
    );

    expect(resolution).toEqual({ status: "onboarding_required" });
    expect(getWorkspaceBoundaryRedirect("/", resolution)).toBe("/onboarding");
    expect(getWorkspaceBoundaryRedirect("/clients", resolution)).toBe(
      "/onboarding",
    );

    await expect(
      requireWorkspaceAccess(userId, foreign.workspace.id, repositories.members),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);
    await expect(
      getAuthorizedWorkspace(userId, foreign.workspace.id, authorizedRead),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);
  });
});
