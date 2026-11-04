// src/features/access-request/RequestAccessForm.tsx
"use client";

import { LANDING_PATH } from "@/application/auth/route-access";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, type FormEvent, type JSX } from "react";

export function RequestAccessForm(): JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    try {
      const response = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to submit access request.");
        setIsSubmitting(false);
        return;
      }

      setSubmittedEmail(email);
      setRequestSent(true);
    } catch {
      setErrorMessage("Unable to submit access request. Please try again.");
      setIsSubmitting(false);
    }
  }

  if (requestSent) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h1>Access Request Submitted</h1>
          <Alert>
            <AlertTitle>Request Pending Review</AlertTitle>
            <AlertDescription>
              Your access request for <strong>{submittedEmail}</strong> has been submitted.
              You will receive an email with further instructions once an admin reviews your request.
            </AlertDescription>
          </Alert>
          <Link href={LANDING_PATH} className="text-sm text-muted-foreground underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <h1>Request Access</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address to request access to FreelanceOS.
          An admin will review your request and send you a sign-up link if approved.
        </p>
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
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Request Access"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Already have access?{" "}
          <Link className="underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
