// src/app/(admin)/loading.tsx
import { LoadingState } from "@/components/states/LoadingState";
import type { JSX } from "react";

export default function AdminLoading(): JSX.Element {
  return <LoadingState message="Loading admin…" />;
}
