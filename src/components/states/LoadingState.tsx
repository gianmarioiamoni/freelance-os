// src/components/states/LoadingState.tsx
import type { JSX } from "react";

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({
  message = "Loading…",
}: LoadingStateProps): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="text-sm text-muted-foreground"
    >
      <p>{message}</p>
    </div>
  );
}
