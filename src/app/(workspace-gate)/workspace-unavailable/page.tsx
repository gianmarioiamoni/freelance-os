// src/app/(workspace-gate)/workspace-unavailable/page.tsx
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import { getWorkspaceResolutionPath } from "@/application/workspace/workspace-route-access";
import { resolveSessionWorkspace } from "@/infrastructure/workspace/current-workspace";
import { redirect } from "next/navigation";
import type { JSX } from "react";

export default async function WorkspaceUnavailablePage(): Promise<JSX.Element> {
  const sessionWorkspace = await resolveSessionWorkspace();

  if (sessionWorkspace.status === "unauthenticated") {
    redirect(SIGN_IN_PATH);
  }

  if (sessionWorkspace.resolution.status !== "ambiguous_membership") {
    redirect(getWorkspaceResolutionPath(sessionWorkspace.resolution));
  }

  return (
    <section className="flex flex-col gap-2">
      <h1>Workspace unavailable</h1>
      <p className="text-sm text-muted-foreground">
        This account cannot open the application right now.
      </p>
    </section>
  );
}
