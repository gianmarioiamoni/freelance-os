// src/app/(auth)/layout.tsx
import { getWorkspaceResolutionPath } from "@/application/workspace/workspace-route-access";
import { AuthBrand } from "@/features/auth/AuthBrand";
import { resolveSessionWorkspace } from "@/infrastructure/workspace/current-workspace";
import { redirect } from "next/navigation";
import type { JSX, ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export default async function AuthLayout({
  children,
}: AuthLayoutProps): Promise<JSX.Element> {
  const sessionWorkspace = await resolveSessionWorkspace();

  if (sessionWorkspace.status === "authenticated") {
    redirect(getWorkspaceResolutionPath(sessionWorkspace.resolution));
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthBrand />
        {children}
      </div>
    </div>
  );
}
