// src/app/(app)/time-tracking/[timeEntryId]/edit/loading.tsx
import { LoadingState } from "@/components/states/LoadingState";
import type { JSX } from "react";

export default function TimeTrackingEditLoading(): JSX.Element {
  return <LoadingState message="Loading time entry..." />;
}