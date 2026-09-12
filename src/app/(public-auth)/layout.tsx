// src/app/(public-auth)/layout.tsx
import type { JSX, ReactNode } from "react";

type PublicAuthLayoutProps = {
  children: ReactNode;
};

export default function PublicAuthLayout({
  children,
}: PublicAuthLayoutProps): JSX.Element {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
