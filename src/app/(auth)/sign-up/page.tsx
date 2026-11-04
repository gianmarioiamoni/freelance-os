// src/app/(auth)/sign-up/page.tsx
import { SignUpForm } from "@/features/auth/SignUpForm";
import { findAccessRequestByToken } from "@/infrastructure/access-request/repository";
import type { JSX } from "react";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
    token?: string;
  }>;
};

export default async function SignUpPage({
  searchParams,
}: SignUpPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  let validatedEmail: string | undefined;

  // Validate token if provided
  if (params.token) {
    const request = await findAccessRequestByToken(params.token);
    if (
      request &&
      request.status === "APPROVED" &&
      request.tokenExpiresAt &&
      request.tokenExpiresAt > new Date()
    ) {
      validatedEmail = request.email;
    }
  }

  return <SignUpForm error={params.error} prefilledEmail={validatedEmail} />;
}
