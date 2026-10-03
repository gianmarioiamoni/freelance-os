// src/app/(admin)/admin/page.tsx
import type { JSX } from "react";

export default function AdminPage(): JSX.Element {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="max-w-2xl space-y-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Admin Area</h1>
        <p className="text-muted-foreground">
          Admin functionality will be implemented in future phases.
        </p>
      </div>
    </div>
  );
}
