// src/app/(auth)/sign-in/page.tsx
import { SignInForm } from "@/features/auth/SignInForm";
import type { JSX } from "react";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignInPage({
  searchParams,
}: SignInPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  return <SignInForm error={params.error} />;
}
