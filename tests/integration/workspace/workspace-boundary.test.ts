// tests/integration/workspace/workspace-boundary.test.ts
import { describe, expect, it } from "vitest";

import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import { resolveWorkspaceContext } from "@/application/workspace/resolve-workspace-context";
import { getWorkspaceBoundaryRedirect } from "@/application/workspace/workspace-route-access";
import { getAuthSessionFromHeaders } from "@/infrastructure/auth/session";

import { registerUser, signInHeaders, uniqueEmail } from "../auth/helpers";
import { repositories, runInTransaction } from "../persistence/helpers";

const creationInput = {
  name: "Studio Iamoni",
  timezone: "Europe/Rome",
  currency: "EUR",
};

describe("workspace-aware application boundary", () => {
  it("uses the Better Auth session user id to require onboarding then resolve one workspace", async () => {
    const email = uniqueEmail("workspace-boundary");
    const { userId } = await registerUser({ email });
    const headers = await signInHeaders({ email });
    const session = await getAuthSessionFromHeaders(headers);

    expect(session).not.toBeNull();
    expect(session?.user.id).toBe(userId);

    if (!session) {
      throw new Error("expected an authenticated session");
    }

    const before = await resolveWorkspaceContext(
      session.user.id,
      repositories.members,
      repositories.workspaces,
    );

    expect(before).toEqual({ status: "onboarding_required" });
    expect(getWorkspaceBoundaryRedirect("/", before)).toBe("/onboarding");
    expect(getWorkspaceBoundaryRedirect("/clients", before)).toBe(
      "/onboarding",
    );

    const created = await createFirstWorkspace(session.user.id, creationInput, {
      runInTransaction,
    });

    const after = await resolveWorkspaceContext(
      session.user.id,
      repositories.members,
      repositories.workspaces,
    );

    expect(after).toEqual({
      status: "resolved",
      context: created.context,
    });
    expect(getWorkspaceBoundaryRedirect("/", after)).toBeNull();
    expect(getWorkspaceBoundaryRedirect("/onboarding", after)).toBe("/");
  });
});
