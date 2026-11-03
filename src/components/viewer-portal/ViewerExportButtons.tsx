// src/components/viewer-portal/ViewerExportButtons.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import type { JSX } from "react";

type TimeEntryDisplay = {
  id: string;
  workDate: Date;
  engagement: string;
  durationMinutes: number;
  description: string | null;
};

type ViewerExportButtonsProps = {
  entries: TimeEntryDisplay[];
};

export function ViewerExportButtons({
  entries,
}: ViewerExportButtonsProps): JSX.Element {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: "excel" | "csv" | "pdf") {
    setIsExporting(true);
    try {
      const data = entries.map((entry) => ({
        data: new Date(entry.workDate).toLocaleDateString("it-IT"),
        ore: (entry.durationMinutes / 60).toFixed(2),
        descrizione: entry.description || "",
      }));

      if (format === "excel") {
        await exportToExcel(data);
      } else if (format === "csv") {
        exportToCSV(data);
      } else if (format === "pdf") {
        await exportToPDF(data);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Errore durante l'esportazione");
    } finally {
      setIsExporting(false);
    }
  }

  async function exportToExcel(
    data: Array<{ data: string; ore: string; descrizione: string }>,
  ) {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: ["data", "ore", "descrizione"],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Timesheet");
    XLSX.writeFile(workbook, `timesheet_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  function exportToCSV(
    data: Array<{ data: string; ore: string; descrizione: string }>,
  ) {
    const headers = ["Data", "Ore", "Descrizione"];
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        [row.data, row.ore, `"${row.descrizione.replace(/"/g, '""')}"`].join(
          ",",
        ),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `timesheet_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }

  async function exportToPDF(
    data: Array<{ data: string; ore: string; descrizione: string }>,
  ) {
    try {
      const pdfMake = await import("pdfmake/build/pdfmake");
      const pdfFonts = await import("pdfmake/build/vfs_fonts");
      
      // Setup fonts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfMakeInstance = pdfMake as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfFontsInstance = pdfFonts as any;
      
      if (pdfMakeInstance.default) {
        pdfMakeInstance.default.vfs = pdfFontsInstance.default?.pdfMake?.vfs || pdfFontsInstance.pdfMake?.vfs;
      } else {
        pdfMakeInstance.vfs = pdfFontsInstance.default?.pdfMake?.vfs || pdfFontsInstance.pdfMake?.vfs;
      }

      const docDefinition = {
        content: [
          { text: "Timesheet Report", style: "header" },
          { text: `Generato il: ${new Date().toLocaleDateString("it-IT")}`, style: "subheader" },
          {
            table: {
              headerRows: 1,
              widths: ["auto", "auto", "*"],
              body: [
                ["Data", "Ore", "Descrizione"],
                ...data.map((row) => [row.data, row.ore, row.descrizione]),
              ],
            },
            layout: "lightHorizontalLines",
          },
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 10],
          },
          subheader: {
            fontSize: 12,
            margin: [0, 0, 0, 20],
          },
        },
      };

      const createPdf = pdfMakeInstance.default?.createPdf || pdfMakeInstance.createPdf;
      createPdf(docDefinition).download(
        `timesheet_${new Date().toISOString().split("T")[0]}.pdf`,
      );
    } catch (error) {
      console.error("PDF export error:", error);
      throw error;
    }
  }

  if (entries.length === 0) {
    return <></>;
  }

  return (
    <div className="flex gap-2 mb-4">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleExport("excel")}
        disabled={isExporting}
        className="flex items-center gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleExport("csv")}
        disabled={isExporting}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        CSV
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleExport("pdf")}
        disabled={isExporting}
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}
