// src/app/(admin)/layout.tsx
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import { requireAdminAuthorization } from "@/application/admin/admin-authorization";
import { SignOutButton } from "@/features/auth/SignOutButton";
import { ErrorState } from "@/components/states/ErrorState";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { redirect } from "next/navigation";
import type { JSX, ReactNode } from "react";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps): Promise<JSX.Element> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  try {
    await requireAdminAuthorization();
  } catch {
    return <ErrorState message="Unauthorized admin access." />;
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          <p className="text-sm font-semibold tracking-tight">
            FreelanceOS Admin
          </p>
          <SignOutButton />
        </div>
      </header>
      <main className="flex flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
