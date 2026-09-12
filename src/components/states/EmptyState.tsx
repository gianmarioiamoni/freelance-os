// src/components/states/EmptyState.tsx
import type { JSX } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({
  title,
  description,
}: EmptyStateProps): JSX.Element {
  return (
    <div role="status" className="grid gap-1">
      <h2>{title}</h2>
      {description ? <p className="muted">{description}</p> : null}
    </div>
  );
}
