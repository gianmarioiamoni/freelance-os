// src/app/(public-auth)/reset-password/page.tsx
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";
import type { JSX } from "react";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps): Promise<JSX.Element> {
  const params = await searchParams;

  return <ResetPasswordForm token={params.token} error={params.error} />;
}
