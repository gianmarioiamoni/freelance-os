// src/app/(public-auth)/viewer-activate/page.tsx
import { ViewerActivateForm } from "@/features/timesheet-viewer/ViewerActivateForm";
import type { JSX } from "react";

type ViewerActivatePageProps = {
  searchParams: Promise<{
    token?: string;
    email?: string;
    error?: string;
  }>;
};

export default async function ViewerActivatePage({
  searchParams,
}: ViewerActivatePageProps): Promise<JSX.Element> {
  const params = await searchParams;

  return (
    <ViewerActivateForm
      token={params.token}
      email={params.email}
      error={params.error}
    />
  );
}
