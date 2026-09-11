// src/app/(app)/layout.tsx
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import { AppShell } from "@/components/app-shell/AppShell";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { redirect } from "next/navigation";
import type { JSX, ReactNode } from "react";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({
  children,
}: AppLayoutProps): Promise<JSX.Element> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  return <AppShell>{children}</AppShell>;
}
