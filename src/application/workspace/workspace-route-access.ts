// src/application/workspace/workspace-route-access.ts
import {
  DEFAULT_AUTHENTICATED_PATH,
  isAuthPagePath,
} from "@/application/auth/route-access";
import type { WorkspaceResolutionResult } from "@/application/workspace/resolve-workspace-context";

export const ONBOARDING_PATH = "/onboarding";
export const WORKSPACE_UNAVAILABLE_PATH = "/workspace-unavailable";

const WORKSPACE_GATE_PATHS = new Set<string>([
  ONBOARDING_PATH,
  WORKSPACE_UNAVAILABLE_PATH,
]);

export function isWorkspaceGatePath(pathname: string): boolean {
  return WORKSPACE_GATE_PATHS.has(pathname);
}

export function isWorkspaceBoundPath(pathname: string): boolean {
  return !isAuthPagePath(pathname) && !isWorkspaceGatePath(pathname);
}

export function getWorkspaceResolutionPath(
  resolution: WorkspaceResolutionResult,
): string {
  if (resolution.status === "onboarding_required") {
    return ONBOARDING_PATH;
  }

  if (resolution.status === "ambiguous_membership") {
    return WORKSPACE_UNAVAILABLE_PATH;
  }

  return DEFAULT_AUTHENTICATED_PATH;
}

export function getWorkspaceBoundaryRedirect(
  pathname: string,
  resolution: WorkspaceResolutionResult,
): string | null {
  if (resolution.status === "resolved" && isWorkspaceBoundPath(pathname)) {
    return null;
  }

  const destination = getWorkspaceResolutionPath(resolution);

  if (pathname === destination) {
    return null;
  }

  return destination;
}
