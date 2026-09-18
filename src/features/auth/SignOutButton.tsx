// src/features/auth/SignOutButton.tsx
"use client";

import { LANDING_PATH } from "@/application/auth/route-access";
import { Button } from "@/components/ui/button";
import { authClient } from "@/infrastructure/auth/auth-client";
import { useRouter } from "next/navigation";
import { useState, type JSX } from "react";

export function SignOutButton(): JSX.Element {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    await authClient.signOut();
    router.refresh();
    router.push(LANDING_PATH);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => {
        void handleSignOut();
      }}
      disabled={isSigningOut}
    >
      {isSigningOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}
