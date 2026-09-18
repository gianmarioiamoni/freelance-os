// src/features/auth/GoogleSignInButton.tsx
"use client";

import { DEFAULT_AUTHENTICATED_PATH } from "@/application/auth/route-access";
import { Button } from "@/components/ui/button";
import { authClient } from "@/infrastructure/auth/auth-client";
import { useState, type JSX } from "react";

type GoogleSignInButtonProps = {
  onError: (message: string) => void;
  disabled?: boolean;
};

export function GoogleSignInButton({
  onError,
  disabled = false,
}: GoogleSignInButtonProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick(): Promise<void> {
    setIsSubmitting(true);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: DEFAULT_AUTHENTICATED_PATH,
    });

    setIsSubmitting(false);

    if (error) {
      onError("Google sign-in is unavailable.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || isSubmitting}
      onClick={() => {
        void handleClick();
      }}
    >
      {isSubmitting ? "Continuing with Google…" : "Continue with Google"}
    </Button>
  );
}
