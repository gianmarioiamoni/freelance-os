// src/app/(public)/page.tsx
import { LandingPage } from "@/features/landing/LandingPage";
import { redirect } from "next/navigation";
import type { JSX } from "react";

type PublicHomePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function PublicHomePage({
  searchParams,
}: PublicHomePageProps): Promise<JSX.Element> {
  const params = await searchParams;
  
  // Redirect auth errors to sign-in page
  if (params.error) {
    redirect(`/sign-in?error=${params.error}`);
  }
  
  return <LandingPage />;
}
