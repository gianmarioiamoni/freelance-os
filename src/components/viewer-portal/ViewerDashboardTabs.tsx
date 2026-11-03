// src/components/viewer-portal/ViewerDashboardTabs.tsx
"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewerTimeEntriesTableWrapper } from "@/components/viewer-portal/ViewerTimeEntriesTableWrapper";
import { ViewerAnomaliesList } from "@/components/viewer-portal/ViewerAnomaliesList";
import { useState, type JSX } from "react";

type TimeEntryDisplay = {
  id: string;
  workDate: Date;
  engagement: string;
  durationMinutes: number;
  description: string | null;
};

type ViewerAnomaly = {
  id: string;
  workDate: Date;
  engagement: string;
  message: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  freelanceNotes: string | null;
  createdAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
};

type ViewerDashboardTabsProps = {
  timeEntries: TimeEntryDisplay[];
  anomalies: ViewerAnomaly[];
  viewerAccessId: string;
  workspaceId: string;
};

export function ViewerDashboardTabs({
  timeEntries,
  anomalies,
  viewerAccessId,
  workspaceId,
}: ViewerDashboardTabsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState("timesheet");
  const openAnomaliesCount = anomalies.filter((a) => a.status === "OPEN").length;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="timesheet">Registrazioni Timesheet</TabsTrigger>
        <TabsTrigger value="anomalies">
          Le Mie Segnalazioni
          {openAnomaliesCount > 0 && (
            <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
              {openAnomaliesCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="timesheet" className="mt-4">
        <Card>
          <CardHeader>
            <h2 className="font-heading text-base leading-snug font-medium">
              Registrazioni del Periodo
            </h2>
          </CardHeader>
          <CardContent>
            <ViewerTimeEntriesTableWrapper
              entries={timeEntries}
              viewerAccessId={viewerAccessId}
              workspaceId={workspaceId}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="anomalies" className="mt-4">
        <Card>
          <CardHeader>
            <h2 className="font-heading text-base leading-snug font-medium">
              Stato Segnalazioni Anomalie
            </h2>
          </CardHeader>
          <CardContent>
            <ViewerAnomaliesList anomalies={anomalies} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
