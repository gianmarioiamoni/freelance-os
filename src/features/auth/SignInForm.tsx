// src/features/auth/SignInForm.tsx
"use client";

import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";
import { authClient } from "@/infrastructure/auth/auth-client";
import Link from "next/link";
import { useState, type FormEvent, type JSX } from "react";

export function SignInForm(): JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage("Invalid email or password.");
      return;
    }

    window.location.assign("/");
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <h1>Sign in</h1>
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
      <div className="flex flex-col gap-1">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      <GoogleSignInButton disabled={isSubmitting} onError={setErrorMessage} />
      <p className="text-sm text-muted-foreground">
        Need an account?{" "}
        <Link className="underline" href="/sign-up">
          Sign up
        </Link>
      </p>
    </form>
  );
}
