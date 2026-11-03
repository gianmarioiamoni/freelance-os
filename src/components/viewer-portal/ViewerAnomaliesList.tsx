// src/components/viewer-portal/ViewerAnomaliesList.tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { JSX } from "react";

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

type ViewerAnomaliesListProps = {
  anomalies: ViewerAnomaly[];
};

export function ViewerAnomaliesList({
  anomalies,
}: ViewerAnomaliesListProps): JSX.Element {
  if (anomalies.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Nessuna segnalazione anomalia trovata.
        </p>
      </div>
    );
  }

  function getStatusBadge(status: ViewerAnomaly["status"]) {
    switch (status) {
      case "OPEN":
        return (
          <Badge variant="default" className="bg-blue-600">
            In Attesa
          </Badge>
        );
      case "ACKNOWLEDGED":
        return (
          <Badge variant="default" className="bg-yellow-600">
            Presa in Carico
          </Badge>
        );
      case "RESOLVED":
        return (
          <Badge variant="default" className="bg-green-600">
            Risolta
          </Badge>
        );
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Data Registrazione</TableHead>
            <TableHead>Impegno</TableHead>
            <TableHead>Tua Segnalazione</TableHead>
            <TableHead className="w-[140px]">Stato</TableHead>
            <TableHead>Segnalata il</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {anomalies.map((anomaly) => (
            <TableRow key={anomaly.id}>
              <TableCell>
                {new Date(anomaly.workDate).toLocaleDateString("it-IT")}
              </TableCell>
              <TableCell className="font-medium">{anomaly.engagement}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="line-clamp-2 text-sm">{anomaly.message}</div>
                  {anomaly.freelanceNotes && (
                    <div className="text-xs text-muted-foreground border-l-2 pl-2 mt-2">
                      <span className="font-semibold">Note Freelancer: </span>
                      {anomaly.freelanceNotes}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(anomaly.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(anomaly.createdAt).toLocaleDateString("it-IT")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
