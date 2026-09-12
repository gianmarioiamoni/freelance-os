// src/app/(app)/layout.tsx
import { AppShell } from "@/components/app-shell/AppShell";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import type { JSX, ReactNode } from "react";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({
  children,
}: AppLayoutProps): Promise<JSX.Element> {
  await getCurrentWorkspaceContext();

  return <AppShell>{children}</AppShell>;
}
