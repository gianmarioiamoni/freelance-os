// src/app/(public)/layout.tsx
import { getWorkspaceResolutionPath } from "@/application/workspace/workspace-route-access";
import { resolveSessionWorkspace } from "@/infrastructure/workspace/current-workspace";
import { redirect } from "next/navigation";
import type { JSX, ReactNode } from "react";

type PublicLayoutProps = {
  children: ReactNode;
};

export default async function PublicLayout({
  children,
}: PublicLayoutProps): Promise<JSX.Element> {
  const sessionWorkspace = await resolveSessionWorkspace();

  if (sessionWorkspace.status === "authenticated") {
    redirect(getWorkspaceResolutionPath(sessionWorkspace.resolution));
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      {children}
    </div>
  );
}
