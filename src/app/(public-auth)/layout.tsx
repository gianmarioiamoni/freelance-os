// src/app/(public-auth)/layout.tsx
import { AuthBrand } from "@/features/auth/AuthBrand";
import type { JSX, ReactNode } from "react";

type PublicAuthLayoutProps = {
  children: ReactNode;
};

export default function PublicAuthLayout({
  children,
}: PublicAuthLayoutProps): JSX.Element {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthBrand />
        {children}
      </div>
    </div>
  );
}
