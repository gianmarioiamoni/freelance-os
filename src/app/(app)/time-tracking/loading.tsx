// src/app/(app)/time-tracking/loading.tsx
import { LoadingState } from "@/components/states/LoadingState";
import type { JSX } from "react";

export default function TimeTrackingLoading(): JSX.Element {
  return <LoadingState message="Loading time entries..." />;
}