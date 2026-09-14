// src/app/(app)/time-tracking/new/loading.tsx
import { LoadingState } from "@/components/states/LoadingState";
import type { JSX } from "react";

export default function TimeTrackingNewLoading(): JSX.Element {
  return <LoadingState message="Loading form..." />;
}