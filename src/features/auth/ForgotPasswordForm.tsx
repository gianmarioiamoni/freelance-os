// src/features/auth/ForgotPasswordForm.tsx
"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/infrastructure/auth/auth-client";
import Link from "next/link";
import { useState, type FormEvent, type JSX } from "react";

const RECOVERY_REQUEST_ACKNOWLEDGEMENT =
  "If an account exists for that email, you will receive a password reset link.";

export function ForgotPasswordForm(): JSX.Element {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatusMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
    } catch {
      // Keep the same outward message whether delivery succeeds or fails.
    }

    setIsSubmitting(false);
    setStatusMessage(RECOVERY_REQUEST_ACKNOWLEDGEMENT);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <h1>Forgot password</h1>
      <div className="flex flex-col gap-1">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {statusMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link className="underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </form>
  );
}
