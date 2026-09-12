// src/features/auth/ResetPasswordForm.tsx
"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/infrastructure/auth/auth-client";
import Link from "next/link";
import { useState, type FormEvent, type JSX } from "react";

type ResetPasswordFormProps = {
  token?: string;
  error?: string;
};

export function ResetPasswordForm({
  token,
  error,
}: ResetPasswordFormProps): JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(
    !token || error === "INVALID_TOKEN"
      ? "This reset link is invalid or has expired."
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = Boolean(token) && error !== "INVALID_TOKEN";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("This reset link is invalid or has expired.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("password") ?? "");

    const { error: resetError } = await authClient.resetPassword({
      newPassword,
      token,
    });

    setIsSubmitting(false);

    if (resetError) {
      setErrorMessage("This reset link is invalid or has expired.");
      return;
    }

    window.location.assign("/sign-in");
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <h1>Reset password</h1>
      <div className="flex flex-col gap-1">
        <label htmlFor="password">New password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={!canSubmit}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting || !canSubmit}>
        {isSubmitting ? "Updating password…" : "Update password"}
      </Button>
      <p className="text-sm text-muted-foreground">
        <Link className="underline" href="/sign-in">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
