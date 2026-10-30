// src/features/timesheet-viewer/AnomalyReportsList.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  acknowledgeAnomalyAction,
  resolveAnomalyAction,
} from "@/features/timesheet-viewer/timesheet-viewer-actions";
import { useState, type JSX } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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

type AnomalyReportsListProps = {
  reports: AnomalyReport[];
};

export function AnomalyReportsList({
  reports,
}: AnomalyReportsListProps): JSX.Element {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<"acknowledge" | "resolve" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  function openDialog(
    reportId: string,
    actionType: "acknowledge" | "resolve",
    existingNotes?: string | null,
  ) {
    setSelectedReport(reportId);
    setAction(actionType);
    setNotes(existingNotes || "");
  }

  function closeDialog() {
    setSelectedReport(null);
    setAction(null);
    setNotes("");
  }

  async function handleSubmit() {
    if (!selectedReport || !action) return;

    setIsProcessing(true);

    if (action === "acknowledge") {
      await acknowledgeAnomalyAction(selectedReport, notes);
    } else {
      await resolveAnomalyAction(selectedReport, notes);
    }

    setIsProcessing(false);
    closeDialog();
  }

  if (reports.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No anomaly reports found.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>
                {new Date(report.workDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="max-w-md truncate">
                {report.message}
              </TableCell>
              <TableCell>
                <span
                  className={
                    report.status === "RESOLVED"
                      ? "text-green-600"
                      : report.status === "ACKNOWLEDGED"
                        ? "text-yellow-600"
                        : "text-blue-600"
                  }
                >
                  {report.status}
                </span>
              </TableCell>
              <TableCell>
                {new Date(report.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {report.status === "OPEN" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openDialog(report.id, "acknowledge", report.freelanceNotes)
                      }
                    >
                      Acknowledge
                    </Button>
                  ) : null}
                  {report.status !== "RESOLVED" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        openDialog(report.id, "resolve", report.freelanceNotes)
                      }
                    >
                      Resolve
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={selectedReport !== null} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "acknowledge"
                ? "Acknowledge Anomaly"
                : "Resolve Anomaly"}
            </DialogTitle>
            <DialogDescription>
              Add notes about your response to this anomaly report.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your notes here..."
                rows={4}
                maxLength={4000}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isProcessing}>
                {isProcessing
                  ? "Processing…"
                  : action === "acknowledge"
                    ? "Acknowledge"
                    : "Resolve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
