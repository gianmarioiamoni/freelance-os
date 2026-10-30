// src/app/(viewer-portal)/layout.tsx
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import { SignOutButton } from "@/features/auth/SignOutButton";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { redirect } from "next/navigation";
import type { ReactNode, JSX } from "react";

type ViewerLayoutProps = {
  children: ReactNode;
};

export default async function ViewerLayout({
  children,
}: ViewerLayoutProps): Promise<JSX.Element> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Timesheet Viewer</h1>
          <SignOutButton />
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
