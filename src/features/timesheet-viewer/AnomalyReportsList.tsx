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
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type AnomalyReport = {
  id: string;
  viewerAccessId: string;
  timeEntryId: string | null;
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
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<"acknowledge" | "resolve" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

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

  async function handleDelete(reportId: string) {
    if (!confirm("Sei sicuro di voler eliminare questa anomalia risolta?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/timesheet-viewer/anomalies/${reportId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete anomaly");
      }

      router.refresh();
    } catch (error) {
      console.error("Error deleting anomaly:", error);
      alert("Errore durante l'eliminazione dell'anomalia");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDeleteAllResolved() {
    const resolvedReports = reports.filter((r) => r.status === "RESOLVED");
    
    if (resolvedReports.length === 0) {
      alert("Non ci sono anomalie risolte da eliminare");
      return;
    }

    if (!confirm(`Sei sicuro di voler eliminare tutte le ${resolvedReports.length} anomalie risolte?`)) {
      return;
    }

    setIsDeletingAll(true);
    try {
      const deletePromises = resolvedReports.map((report) =>
        fetch(`/api/timesheet-viewer/anomalies/${report.id}`, {
          method: "DELETE",
        })
      );

      await Promise.all(deletePromises);
      router.refresh();
    } catch (error) {
      console.error("Error deleting anomalies:", error);
      alert("Errore durante l'eliminazione delle anomalie");
    } finally {
      setIsDeletingAll(false);
    }
  }

  if (reports.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Nessuna segnalazione anomalia trovata.
      </div>
    );
  }

  const resolvedCount = reports.filter((r) => r.status === "RESOLVED").length;

  return (
    <>
      {resolvedCount > 0 && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAllResolved}
            disabled={isDeletingAll}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeletingAll ? "Eliminazione..." : `Elimina tutte le risolte (${resolvedCount})`}
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrizione Anomalia</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Segnalata il</TableHead>
            <TableHead>Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>
                {new Date(report.workDate).toLocaleDateString("it-IT")}
              </TableCell>
              <TableCell className="max-w-md">
                <div className="line-clamp-2">{report.message}</div>
              </TableCell>
              <TableCell>
                <span
                  className={
                    report.status === "RESOLVED"
                      ? "text-green-600 font-medium"
                      : report.status === "ACKNOWLEDGED"
                        ? "text-yellow-600 font-medium"
                        : "text-blue-600 font-medium"
                  }
                >
                  {report.status === "RESOLVED"
                    ? "RISOLTA"
                    : report.status === "ACKNOWLEDGED"
                      ? "PRESA IN CARICO"
                      : "APERTA"}
                </span>
              </TableCell>
              <TableCell>
                {new Date(report.createdAt).toLocaleDateString("it-IT")}
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
                      Prendi in carico
                    </Button>
                  ) : null}
                  {report.status !== "RESOLVED" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        openDialog(report.id, "resolve", report.freelanceNotes)
                      }
                    >
                      Risolvi
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(report.id)}
                      disabled={isProcessing}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Elimina
                    </Button>
                  )}
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
                ? "Prendi in carico anomalia"
                : "Risolvi anomalia"}
            </DialogTitle>
            <DialogDescription>
              Aggiungi note sulla tua risposta a questa segnalazione.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="notes">Note (opzionale)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Aggiungi le tue note qui..."
                rows={4}
                maxLength={4000}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeDialog}>
                Annulla
              </Button>
              <Button onClick={handleSubmit} disabled={isProcessing}>
                {isProcessing
                  ? "Elaborazione..."
                  : action === "acknowledge"
                    ? "Prendi in carico"
                    : "Risolvi"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
