// src/features/auth/SignInForm.tsx
"use client";

import { DEFAULT_AUTHENTICATED_PATH, LANDING_PATH } from "@/application/auth/route-access";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";
import { Wordmark } from "@/features/landing/Wordmark";
import { authClient } from "@/infrastructure/auth/auth-client";
import Link from "next/link";
import { useState, type FormEvent, type JSX } from "react";

type AuthMode = "password" | "magicLink";

export function SignInForm(): JSX.Element {
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
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

    window.location.assign(DEFAULT_AUTHENTICATED_PATH);
  }

  async function handleMagicLinkSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    try {
      const response = await fetch("/api/viewer-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to send sign-in link");
        setIsSubmitting(false);
        return;
      }

      setMagicLinkEmail(email);
      setMagicLinkSent(true);
    } catch {
      setErrorMessage("Unable to send sign-in link. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Wordmark href={LANDING_PATH} />
      <div className="flex flex-col gap-4">
        <h1>Sign in</h1>

        {magicLinkSent ? (
          <Alert>
            <AlertTitle>Check Your Email</AlertTitle>
            <AlertDescription>
              If a timesheet viewer account exists for {magicLinkEmail}, a sign-in link has been sent. 
              Click the link in the email to access your dashboard.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Mode Selector */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("password");
                  setErrorMessage(null);
                }}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  authMode === "password"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Freelancer
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("magicLink");
                  setErrorMessage(null);
                }}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  authMode === "magicLink"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Report Viewer
              </button>
            </div>

            {authMode === "password" ? (
              <form className="flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
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
                <GoogleSignInButton disabled={isSubmitting} onError={setErrorMessage} mode="sign-in" />
                <p className="text-sm text-muted-foreground">
                  <Link className="underline" href="/forgot-password">
                    Forgot password?
                  </Link>
                </p>
              </form>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={handleMagicLinkSubmit}>
                <p className="text-sm text-muted-foreground">
                  Enter your email to receive a secure sign-in link for timesheet viewer access. 
                  No password required.
                </p>
                <div className="flex flex-col gap-1">
                  <label htmlFor="magic-email">Email</label>
                  <input
                    id="magic-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                {errorMessage ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errorMessage}
                  </p>
                ) : null}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending…" : "Send Sign-In Link"}
                </Button>
              </form>
            )}

            <p className="text-sm text-muted-foreground">
              Need an account?{" "}
              <Link className="underline" href="/sign-up">
                Sign up
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
