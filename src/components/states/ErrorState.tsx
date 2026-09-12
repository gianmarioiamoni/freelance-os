// src/components/states/ErrorState.tsx
import type { JSX } from "react";

type ErrorStateProps = {
  title?: string;
  message: string;
};

export function ErrorState({
  title = "Something went wrong",
  message,
}: ErrorStateProps): JSX.Element {
  return (
    <div role="alert" className="grid gap-1">
      <h2>{title}</h2>
      <p className="muted">{message}</p>
    </div>
  );
}
