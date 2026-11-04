// src/features/auth/GoogleSignInButton.tsx
"use client";

import { DEFAULT_AUTHENTICATED_PATH } from "@/application/auth/route-access";
import { Button } from "@/components/ui/button";
import { authClient } from "@/infrastructure/auth/auth-client";
import { useState, type JSX } from "react";

type GoogleSignInButtonProps = {
  onError: (message: string) => void;
  disabled?: boolean;
  mode?: "sign-in" | "sign-up";
};

export function GoogleSignInButton({
  onError,
  disabled = false,
  mode = "sign-in",
}: GoogleSignInButtonProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick(): Promise<void> {
    setIsSubmitting(true);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: DEFAULT_AUTHENTICATED_PATH,
      fetchOptions: {
        body: {
          requestSignUp: mode === "sign-up",
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      const message =
        mode === "sign-in"
          ? "Please sign up first before using Google sign-in."
          : "Google sign-up is unavailable.";
      onError(message);
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
