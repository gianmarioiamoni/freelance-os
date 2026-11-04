// src/features/auth/SignUpForm.tsx
"use client";

import { DEFAULT_AUTHENTICATED_PATH, LANDING_PATH } from "@/application/auth/route-access";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";
import { authClient } from "@/infrastructure/auth/auth-client";
import Link from "next/link";
import { useState, type FormEvent, type JSX } from "react";

type SignUpFormProps = {
  error?: string;
  prefilledEmail?: string;
  showRequestAccessLink?: boolean;
};

export function SignUpForm({ 
  error, 
  prefilledEmail,
  showRequestAccessLink = true,
}: SignUpFormProps): JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error ? "Unable to sign up with Google. Please try again." : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage("Unable to create this account. Access may not be granted.");
      return;
    }

    window.location.assign(DEFAULT_AUTHENTICATED_PATH);
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <h1>Sign up</h1>
      <div className="flex flex-col gap-1">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={prefilledEmail}
          readOnly={Boolean(prefilledEmail)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        {prefilledEmail && (
          <p className="text-xs text-muted-foreground">
            Your email has been pre-filled from your approved access request.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
      <GoogleSignInButton disabled={isSubmitting} onError={setErrorMessage} mode="sign-up" />
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="underline" href="/sign-in">
          Sign in
        </Link>
      </p>
      {showRequestAccessLink && (
        <p className="text-sm text-muted-foreground">
          Need access?{" "}
          <Link className="underline" href="/request-access">
            Request access
          </Link>
        </p>
      )}
      </form>
    </div>
  );
}
