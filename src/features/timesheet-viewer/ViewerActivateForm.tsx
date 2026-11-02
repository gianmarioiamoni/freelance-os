// src/features/timesheet-viewer/ViewerActivateForm.tsx
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, type JSX } from "react";

type ViewerActivateFormProps = {
  token?: string;
  email?: string;
  error?: string;
};

export function ViewerActivateForm({
  token,
  email: initialEmail,
  error: initialError,
}: ViewerActivateFormProps): JSX.Element {
  const [email, setEmail] = useState(initialEmail || "");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [success, setSuccess] = useState(false);

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      setError("No activation token provided");
      return;
    }

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/viewer-portal/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          viewerInviteToken: token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send sign-in link");
        setIsSending(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Unable to send sign-in link. Please try again.");
      setIsSending(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Viewer Activation</h1>
        <Alert variant="destructive">
          <AlertTitle>Invalid Link</AlertTitle>
          <AlertDescription>
            This activation link is invalid or incomplete.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Timesheet Viewer Activation</h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success ? (
        <Alert className="mb-4">
          <AlertTitle>Check Your Email</AlertTitle>
          <AlertDescription>
            A sign-in link has been sent to {email}. Click the link in the email
            to access your timesheet dashboard.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSendMagicLink}>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your email address to receive a secure sign-in link. No
            password required.
          </p>

          <div className="mb-6">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={isSending}
              required
            />
          </div>

          <Button type="submit" disabled={isSending} className="w-full">
            {isSending ? "Sending..." : "Send Sign-In Link"}
          </Button>
        </form>
      )}
    </div>
  );
}
