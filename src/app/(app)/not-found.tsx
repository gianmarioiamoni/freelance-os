// src/app/(app)/not-found.tsx
import { EmptyState } from "@/components/states/EmptyState";
import type { JSX } from "react";

export default function AppNotFound(): JSX.Element {
  return (
    <EmptyState
      title="Page not found"
      description="This page does not exist."
    />
  );
}
