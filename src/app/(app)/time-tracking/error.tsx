// src/app/(app)/time-tracking/error.tsx
"use client";

import { ErrorState } from "@/components/states/ErrorState";
import type { JSX } from "react";

type TimeTrackingErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function TimeTrackingError({
  error,
}: TimeTrackingErrorProps): JSX.Element {
  return (
    <ErrorState 
      title="Unable to load time tracking"
      message={error.message || "There was a problem loading your time entries. Please try again."}
    />
  );
}