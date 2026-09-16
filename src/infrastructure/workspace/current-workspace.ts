// src/infrastructure/workspace/current-workspace.ts
import "server-only";

import { SIGN_IN_PATH } from "@/application/auth/route-access";
import { resolveWorkspaceContext } from "@/application/workspace/resolve-workspace-context";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { getWorkspaceResolutionPath } from "@/application/workspace/workspace-route-access";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { redirect } from "next/navigation";
import { cache } from "react";

export type SessionWorkspace =
  | { status: "unauthenticated" }
  | {
      status: "authenticated";
      userId: string;
      resolution: Awaited<ReturnType<typeof resolveWorkspaceContext>>;
    };

export const resolveSessionWorkspace = cache(
  async (): Promise<SessionWorkspace> => {
    const session = await getServerAuthSession();

    if (!session) {
      return { status: "unauthenticated" };
    }

    return {
      status: "authenticated",
      userId: session.user.id,
      resolution: await resolveWorkspaceContext(
        session.user.id,
        createRepositories().members,
        createRepositories().workspaces,
      ),
    };
  },
);

export async function getCurrentWorkspaceContext(): Promise<WorkspaceContext> {
  const sessionWorkspace = await resolveSessionWorkspace();

  if (sessionWorkspace.status === "unauthenticated") {
    redirect(SIGN_IN_PATH);
  }

  if (sessionWorkspace.resolution.status !== "resolved") {
    redirect(getWorkspaceResolutionPath(sessionWorkspace.resolution));
  }

  return sessionWorkspace.resolution.context;
}
