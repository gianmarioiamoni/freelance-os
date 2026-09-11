// src/app/(auth)/layout.tsx
import { DEFAULT_AUTHENTICATED_PATH } from "@/application/auth/route-access";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { redirect } from "next/navigation";
import type { JSX, ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export default async function AuthLayout({
  children,
}: AuthLayoutProps): Promise<JSX.Element> {
  const session = await getServerAuthSession();

  if (session) {
    redirect(DEFAULT_AUTHENTICATED_PATH);
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
