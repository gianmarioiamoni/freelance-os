// src/app/(auth)/sign-up/page.tsx
import { SignUpForm } from "@/features/auth/SignUpForm";
import type { JSX } from "react";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignUpPage({
  searchParams,
}: SignUpPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  return <SignUpForm error={params.error} />;
}
