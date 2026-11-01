// src/features/timesheet-viewer/ViewerActivateForm.tsx
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect, type JSX } from "react";

type ViewerActivateFormProps = {
  token?: string;
  error?: string;
};

export function ViewerActivateForm({
  token,
  error: initialError,
}: ViewerActivateFormProps): JSX.Element {
  const router = useRouter();
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Auto-activate if token is present and user is already authenticated
    if (token && !isActivating && !error && !success) {
      handleActivate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleActivate() {
    if (!token) {
      setError("No activation token provided");
      return;
    }

    setIsActivating(true);
    setError(null);

    try {
      const response = await fetch("/api/viewer-portal/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Activation failed");
        setIsActivating(false);
        return;
      }

      setSuccess(true);
      
      // Redirect to viewer dashboard after successful activation
      setTimeout(() => {
        router.push("/viewer-dashboard");
      }, 2000);
    } catch {
      setError("Unable to activate viewer access. Please try again.");
      setIsActivating(false);
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
          <AlertTitle>Activation Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success ? (
        <Alert className="mb-4">
          <AlertTitle>Activation Successful</AlertTitle>
          <AlertDescription>
            Your viewer access has been activated. Redirecting to dashboard...
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-6">
            {isActivating
              ? "Activating your timesheet viewer access..."
              : "Click below to activate your timesheet viewer access."}
          </p>

          {!isActivating && (
            <Button
              onClick={handleActivate}
              disabled={isActivating}
              className="w-full"
            >
              Activate Access
            </Button>
          )}
        </>
      )}
    </div>
  );
}
