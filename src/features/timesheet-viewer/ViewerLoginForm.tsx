// src/features/timesheet-viewer/ViewerLoginForm.tsx
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, type JSX } from "react";

export function ViewerLoginForm(): JSX.Element {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/viewer-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
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

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Timesheet Viewer Sign In</h1>

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
