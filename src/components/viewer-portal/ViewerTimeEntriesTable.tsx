// src/components/viewer-portal/ViewerTimeEntriesTable.tsx
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, type JSX } from "react";
import { AlertTriangle } from "lucide-react";

type TimeEntryDisplay = {
  id: string;
  workDate: Date;
  engagement: string;
  durationMinutes: number;
  description: string | null;
};

type ViewerTimeEntriesTableProps = {
  entries: TimeEntryDisplay[];
  onReportAnomaly: (
    timeEntryId: string,
    workDate: Date,
    message: string,
  ) => Promise<void>;
};

export function ViewerTimeEntriesTable({
  entries,
  onReportAnomaly,
}: ViewerTimeEntriesTableProps): JSX.Element {
  const [selectedEntry, setSelectedEntry] = useState<TimeEntryDisplay | null>(
    null,
  );
  const [anomalyMessage, setAnomalyMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  function openDialog(entry: TimeEntryDisplay) {
    setSelectedEntry(entry);
    setAnomalyMessage("");
    setShowConfirmation(false);
  }

  function closeDialog() {
    setSelectedEntry(null);
    setAnomalyMessage("");
    setShowConfirmation(false);
  }

  async function handleSubmit() {
    if (!selectedEntry || anomalyMessage.trim().length < 10) {
      return;
    }

    setIsProcessing(true);

    try {
      await onReportAnomaly(
        selectedEntry.id,
        selectedEntry.workDate,
        anomalyMessage.trim(),
      );

      setShowConfirmation(true);
      setAnomalyMessage("");
    } catch (error) {
      console.error("Failed to report anomaly:", error);
      alert("Failed to submit anomaly report. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleConfirmationClose() {
    setShowConfirmation(false);
    closeDialog();
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No time entries for this period</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Data</TableHead>
              <TableHead>Impegno</TableHead>
              <TableHead className="w-[100px]">Ore</TableHead>
              <TableHead className="min-w-[200px]">Descrizione</TableHead>
              <TableHead className="w-[140px]">Azione</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const hours = (entry.durationMinutes / 60).toFixed(2);
              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    {new Date(entry.workDate).toLocaleDateString("it-IT")}
                  </TableCell>
                  <TableCell className="font-medium">{entry.engagement}</TableCell>
                  <TableCell className="text-right font-mono">{hours}h</TableCell>
                  <TableCell className="max-w-md">
                    {entry.description || <span className="text-muted-foreground italic">Nessuna descrizione</span>}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog(entry)}
                      className="flex items-center gap-2"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Segnala anomalia
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={selectedEntry !== null && !showConfirmation}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Segnala anomalia</DialogTitle>
            <DialogDescription>
              Descrivi l&apos;anomalia riscontrata per questa registrazione.
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 space-y-1">
                <div className="text-sm">
                  <span className="font-semibold">Data: </span>
                  {new Date(selectedEntry.workDate).toLocaleDateString("it-IT")}
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Impegno: </span>
                  {selectedEntry.engagement}
                </div>
                {selectedEntry.description && (
                  <div className="text-sm">
                    <span className="font-semibold">Descrizione: </span>
                    {selectedEntry.description}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="anomaly-message">
                  Descrivi l&apos;anomalia <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="anomaly-message"
                  value={anomalyMessage}
                  onChange={(e) => setAnomalyMessage(e.target.value)}
                  placeholder="Descrivi il problema riscontrato (minimo 10 caratteri)"
                  rows={4}
                  maxLength={2000}
                  required
                />
                <div className="text-xs text-muted-foreground text-right">
                  {anomalyMessage.length}/2000
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDialog} disabled={isProcessing}>
                  Annulla
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isProcessing || anomalyMessage.trim().length < 10}
                >
                  {isProcessing ? "Invio in corso..." : "Invia segnalazione"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmation} onOpenChange={handleConfirmationClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Segnalazione inviata</DialogTitle>
            <DialogDescription>
              La tua segnalazione è stata inviata al Freelancer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={handleConfirmationClose}>Chiudi</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
