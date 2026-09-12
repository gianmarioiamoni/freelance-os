// tests/unit/application/workspace/workspace-route-access.test.ts
import { describe, expect, it } from "vitest";

import { DEFAULT_AUTHENTICATED_PATH } from "@/application/auth/route-access";
import {
  getWorkspaceBoundaryRedirect,
  getWorkspaceResolutionPath,
  isWorkspaceBoundPath,
  isWorkspaceGatePath,
  ONBOARDING_PATH,
  WORKSPACE_UNAVAILABLE_PATH,
} from "@/application/workspace/workspace-route-access";

const onboarding = { status: "onboarding_required" as const };
const ambiguous = { status: "ambiguous_membership" as const };
const resolved = {
  status: "resolved" as const,
  context: {
    workspaceId: "workspace-1",
    userId: "user-1",
    role: "OWNER" as const,
  },
};

describe("workspace route access", () => {
  it("identifies onboarding and fail-closed paths as workspace gates", () => {
    expect(isWorkspaceGatePath(ONBOARDING_PATH)).toBe(true);
    expect(isWorkspaceGatePath(WORKSPACE_UNAVAILABLE_PATH)).toBe(true);
    expect(isWorkspaceGatePath(DEFAULT_AUTHENTICATED_PATH)).toBe(false);
    expect(isWorkspaceBoundPath(DEFAULT_AUTHENTICATED_PATH)).toBe(true);
    expect(isWorkspaceBoundPath("/clients")).toBe(true);
    expect(isWorkspaceBoundPath(ONBOARDING_PATH)).toBe(false);
    expect(isWorkspaceBoundPath("/sign-in")).toBe(false);
  });

  it("maps membership resolution to a deterministic destination", () => {
    expect(getWorkspaceResolutionPath(onboarding)).toBe(ONBOARDING_PATH);
    expect(getWorkspaceResolutionPath(resolved)).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(getWorkspaceResolutionPath(ambiguous)).toBe(
      WORKSPACE_UNAVAILABLE_PATH,
    );
  });

  it("sends authenticated users without a workspace to onboarding", () => {
    expect(getWorkspaceBoundaryRedirect("/", onboarding)).toBe(ONBOARDING_PATH);
    expect(getWorkspaceBoundaryRedirect("/clients", onboarding)).toBe(
      ONBOARDING_PATH,
    );
    expect(getWorkspaceBoundaryRedirect(ONBOARDING_PATH, onboarding)).toBeNull();
  });

  it("keeps a single membership on workspace-bound application routes", () => {
    expect(getWorkspaceBoundaryRedirect("/", resolved)).toBeNull();
    expect(getWorkspaceBoundaryRedirect("/clients", resolved)).toBeNull();
    expect(getWorkspaceBoundaryRedirect(ONBOARDING_PATH, resolved)).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
  });

  it("fails closed when more than one membership exists", () => {
    expect(getWorkspaceBoundaryRedirect("/", ambiguous)).toBe(
      WORKSPACE_UNAVAILABLE_PATH,
    );
    expect(getWorkspaceBoundaryRedirect(ONBOARDING_PATH, ambiguous)).toBe(
      WORKSPACE_UNAVAILABLE_PATH,
    );
    expect(
      getWorkspaceBoundaryRedirect(WORKSPACE_UNAVAILABLE_PATH, ambiguous),
    ).toBeNull();
  });
});
