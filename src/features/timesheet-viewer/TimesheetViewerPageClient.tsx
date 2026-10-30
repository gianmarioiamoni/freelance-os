// src/features/timesheet-viewer/TimesheetViewerPageClient.tsx
"use client";

import { InviteViewerForm } from "@/features/timesheet-viewer/InviteViewerForm";
import { ViewerAccessList } from "@/features/timesheet-viewer/ViewerAccessList";
import { AnomalyReportsList } from "@/features/timesheet-viewer/AnomalyReportsList";
import { ManageContractsDialog } from "@/features/timesheet-viewer/ManageContractsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, type JSX } from "react";

type ViewerAccess = {
  id: string;
  email: string;
  status: string;
  userId: string | null;
  createdAt: Date;
  revokedAt: Date | null;
};

type AnomalyReport = {
  id: string;
  viewerAccessId: string;
  workDate: Date;
  message: string;
  status: string;
  freelanceNotes: string | null;
  createdAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
};

type Contract = {
  id: string;
  reference: string | null;
  clientName: string;
};

type AuthorizedContract = {
  contractId: string;
  displayLabel: string | null;
};

type TimesheetViewerPageClientProps = {
  viewers: ViewerAccess[];
  reports: AnomalyReport[];
  contracts: Contract[];
  authorizedContractsMap: Record<string, AuthorizedContract[]>;
};

export function TimesheetViewerPageClient({
  viewers,
  reports,
  contracts,
  authorizedContractsMap,
}: TimesheetViewerPageClientProps): JSX.Element {
  const [manageViewerId, setManageViewerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("viewers");

  const selectedViewer = viewers.find((v) => v.id === manageViewerId);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="grid gap-6">
        <TabsList>
          <TabsTrigger value="viewers">Viewers</TabsTrigger>
          <TabsTrigger value="invite">Invite New</TabsTrigger>
          <TabsTrigger value="reports">Anomaly Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="viewers" className="grid gap-4">
          <ViewerAccessList
            viewers={viewers}
            onManageContracts={setManageViewerId}
          />
        </TabsContent>

        <TabsContent value="invite" className="max-w-md">
          <InviteViewerForm />
        </TabsContent>

        <TabsContent value="reports" className="grid gap-4">
          <AnomalyReportsList reports={reports} />
        </TabsContent>
      </Tabs>

      {selectedViewer && (
        <ManageContractsDialog
          open={manageViewerId !== null}
          onOpenChange={(open) => !open && setManageViewerId(null)}
          viewerAccessId={selectedViewer.id}
          viewerEmail={selectedViewer.email}
          contracts={contracts}
          authorizedContracts={authorizedContractsMap[selectedViewer.id] || []}
        />
      )}
    </>
  );
}
