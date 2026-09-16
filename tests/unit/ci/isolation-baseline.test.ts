// tests/unit/ci/isolation-baseline.test.ts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const baselineFiles = [
  "tests/unit/application/workspace/require-workspace-access.test.ts",
  "tests/unit/application/workspace/get-authorized-workspace.test.ts",
  "tests/unit/application/workspace/resolve-workspace-context.test.ts",
  "tests/unit/application/workspace/workspace-route-access.test.ts",
  "tests/unit/application/auth/route-access.test.ts",
  "tests/integration/workspace/authorization-isolation.test.ts",
  "tests/integration/workspace/membership-resolution.test.ts",
  "tests/integration/workspace/workspace-boundary.test.ts",
  "tests/integration/persistence/workspace-isolation.test.ts",
  "tests/integration/auth/protected-boundary.test.ts",
  "tests/e2e/onboarding.spec.ts",
  "tests/e2e/app-shell.spec.ts",
] as const;

function readRepoFile(relativePath: string): string {
  const absolutePath = path.join(process.cwd(), relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("isolation and authorization regression baseline", () => {
  it("locks the Foundation isolation and authorization test files", () => {
    for (const relativePath of baselineFiles) {
      expect(existsSync(path.join(process.cwd(), relativePath)), relativePath).toBe(
        true,
      );
    }
  });

  it("keeps member access and non-member denial asserted", () => {
    const requireAccess = readRepoFile(
      "tests/unit/application/workspace/require-workspace-access.test.ts",
    );
    const authorizedRead = readRepoFile(
      "tests/unit/application/workspace/get-authorized-workspace.test.ts",
    );
    const isolation = readRepoFile(
      "tests/integration/workspace/authorization-isolation.test.ts",
    );

    expect(requireAccess).toContain('describe("requireWorkspaceAccess"');
    expect(requireAccess).toContain(
      "returns the authorized context with timezone for a valid membership",
    );
    expect(requireAccess).toContain(
      "denies a user who is not a member of the requested workspace",
    );
    expect(authorizedRead).toContain('describe("getAuthorizedWorkspace"');
    expect(authorizedRead).toContain(
      "returns the authorized context and workspace for a member",
    );
    expect(authorizedRead).toContain(
      "denies a non-member without reading workspace persistence",
    );
    expect(isolation).toContain(
      'describe("workspace authorization and isolation"',
    );
    expect(isolation).toContain(
      "allows a member to obtain authorized access with the attached role",
    );
    expect(isolation).toContain(
      "denies a session user who is not a member of another workspace",
    );
  });

  it("keeps tenant isolation and identifier substitution asserted", () => {
    const requireAccess = readRepoFile(
      "tests/unit/application/workspace/require-workspace-access.test.ts",
    );
    const authorizedRead = readRepoFile(
      "tests/unit/application/workspace/get-authorized-workspace.test.ts",
    );
    const isolation = readRepoFile(
      "tests/integration/workspace/authorization-isolation.test.ts",
    );
    const persistence = readRepoFile(
      "tests/integration/persistence/workspace-isolation.test.ts",
    );

    expect(requireAccess).toContain(
      "denies identifier substitution of an unauthorized workspace",
    );
    expect(authorizedRead).toContain(
      "denies identifier substitution without reading the foreign workspace",
    );
    expect(isolation).toContain(
      "denies identifier substitution of another workspace id",
    );
    expect(isolation).toContain(
      "cannot read another workspace through an authorized workspace operation",
    );
    expect(persistence).toContain('describe("workspace isolation"');
    expect(persistence).toContain(
      "does not expose workspace A records through workspace B repository operations",
    );
  });

  it("keeps membership resolution fail-closed and onboarding asserted", () => {
    const resolution = readRepoFile(
      "tests/unit/application/workspace/resolve-workspace-context.test.ts",
    );
    const routeAccess = readRepoFile(
      "tests/unit/application/workspace/workspace-route-access.test.ts",
    );
    const isolation = readRepoFile(
      "tests/integration/workspace/authorization-isolation.test.ts",
    );
    const boundary = readRepoFile(
      "tests/integration/workspace/workspace-boundary.test.ts",
    );

    expect(resolution).toContain('describe("resolveWorkspaceContext"');
    expect(resolution).toContain(
      "returns onboarding required when the user has no memberships",
    );
    expect(resolution).toContain(
      "resolves the single membership into a workspace context with timezone",
    );
    expect(resolution).toContain(
      "fails closed when multiple memberships exist",
    );
    expect(routeAccess).toContain(
      "sends authenticated users without a workspace to onboarding",
    );
    expect(routeAccess).toContain(
      "fails closed when more than one membership exists",
    );
    expect(isolation).toContain(
      "fails closed when more than one membership exists",
    );
    expect(isolation).toContain(
      "requires onboarding and denies workspace access when the user has no memberships",
    );
    expect(boundary).toContain(
      "uses the Better Auth session user id to require onboarding then resolve one workspace",
    );
  });

  it("keeps the browser trust boundary and authenticated gate asserted", () => {
    const routeAccess = readRepoFile(
      "tests/unit/application/workspace/workspace-route-access.test.ts",
    );
    const authAccess = readRepoFile(
      "tests/unit/application/auth/route-access.test.ts",
    );
    const protectedBoundary = readRepoFile(
      "tests/integration/auth/protected-boundary.test.ts",
    );
    const onboarding = readRepoFile("tests/e2e/onboarding.spec.ts");
    const appShell = readRepoFile("tests/e2e/app-shell.spec.ts");

    expect(routeAccess).toContain(
      "does not treat route or query workspace identifiers as authorization",
    );
    expect(authAccess).toContain('describe("auth route access"');
    expect(protectedBoundary).toContain(
      "rejects unauthenticated access to application routes",
    );
    expect(protectedBoundary).toContain(
      "allows authenticated access and reads identity from Better Auth",
    );
    expect(onboarding).toContain(
      "should send authenticated users without a workspace to onboarding",
    );
    expect(onboarding).toContain("/?workspaceId=00000000-0000-0000-0000-000000000001");
    expect(appShell).toContain(
      "should keep the application shell behind authentication",
    );
  });
});
