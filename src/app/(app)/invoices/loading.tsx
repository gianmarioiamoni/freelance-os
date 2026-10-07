// src/app/(app)/invoices/loading.tsx
import { LoadingState } from "@/components/states/LoadingState";
import type { JSX } from "react";

export default function InvoicesLoading(): JSX.Element {
  return <LoadingState message="Loading invoices…" />;
}
