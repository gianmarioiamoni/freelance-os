// src/features/auth/SignOutButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/infrastructure/auth/auth-client";
import { useState, type JSX } from "react";

export function SignOutButton(): JSX.Element {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    await authClient.signOut();
    window.location.assign("/sign-in");
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
