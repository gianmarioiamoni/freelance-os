// src/app/(workspace-gate)/layout.tsx
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import { SignOutButton } from "@/features/auth/SignOutButton";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { redirect } from "next/navigation";
import type { JSX, ReactNode } from "react";

type WorkspaceGateLayoutProps = {
  children: ReactNode;
};

export default async function WorkspaceGateLayout({
  children,
}: WorkspaceGateLayoutProps): Promise<JSX.Element> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          <p className="text-sm font-semibold tracking-tight">FreelanceOS</p>
          <SignOutButton />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
