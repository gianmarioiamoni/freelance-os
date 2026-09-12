// src/app/(workspace-gate)/onboarding/page.tsx
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import { listSupportedCurrencies, listSupportedTimeZones } from "@/application/workspace/workspace-creation-input";
import { getWorkspaceResolutionPath } from "@/application/workspace/workspace-route-access";
import { CreateFirstWorkspaceForm } from "@/features/workspace/CreateFirstWorkspaceForm";
import { resolveSessionWorkspace } from "@/infrastructure/workspace/current-workspace";
import { redirect } from "next/navigation";
import type { JSX } from "react";

export default async function OnboardingPage(): Promise<JSX.Element> {
  const sessionWorkspace = await resolveSessionWorkspace();

  if (sessionWorkspace.status === "unauthenticated") {
    redirect(SIGN_IN_PATH);
  }

  if (sessionWorkspace.resolution.status !== "onboarding_required") {
    redirect(getWorkspaceResolutionPath(sessionWorkspace.resolution));
  }

  return (
    <CreateFirstWorkspaceForm
      timezones={listSupportedTimeZones()}
      currencies={listSupportedCurrencies()}
    />
  );
}
