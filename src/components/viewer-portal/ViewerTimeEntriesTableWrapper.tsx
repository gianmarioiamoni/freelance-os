// src/components/viewer-portal/ViewerTimeEntriesTableWrapper.tsx
"use client";

import { ViewerTimeEntriesTable } from "@/components/viewer-portal/ViewerTimeEntriesTable";
import type { JSX } from "react";

type TimeEntryDisplay = {
  id: string;
  workDate: Date;
  engagement: string;
  description: string | null;
};

type ViewerTimeEntriesTableWrapperProps = {
  entries: TimeEntryDisplay[];
  viewerAccessId: string;
  workspaceId: string;
};

export function ViewerTimeEntriesTableWrapper({
  entries,
  viewerAccessId,
  workspaceId,
}: ViewerTimeEntriesTableWrapperProps): JSX.Element {
  async function handleReportAnomaly(
    timeEntryId: string,
    workDate: Date,
    message: string,
  ): Promise<void> {
    const response = await fetch("/api/viewer-portal/anomalies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId,
        viewerAccessId,
        timeEntryId,
        message,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to report anomaly");
    }
  }

  return (
    <ViewerTimeEntriesTable
      entries={entries}
      onReportAnomaly={handleReportAnomaly}
    />
  );
}
