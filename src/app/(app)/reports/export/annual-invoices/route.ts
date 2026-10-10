// src/app/(app)/reports/export/annual-invoices/route.ts
import { AnnualInvoiceReportService } from "@/application/invoices/annual-invoice-report";
import {
  annualInvoiceFilename,
  serializeAnnualInvoiceCsv,
} from "@/features/reporting/annual-invoice-csv";
import { serializeAnnualInvoiceXlsx } from "@/features/reporting/annual-invoice-xlsx";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { isNextRedirectError } from "@/lib/next-redirect-error";

export async function GET(request: Request): Promise<Response> {
  const context = await getCurrentWorkspaceContext();
  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const format = url.searchParams.get("format") ?? "csv";

  if (!yearParam) {
    return new Response("Year parameter required", { status: 400 });
  }

  const year = parseInt(yearParam, 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return new Response("Invalid year", { status: 400 });
  }

  if (format !== "csv" && format !== "xlsx") {
    return new Response("Invalid format (must be csv or xlsx)", { status: 400 });
  }

  const repositories = createRepositories();
  const service = new AnnualInvoiceReportService(
    repositories.invoices,
    repositories.payments,
  );

  try {
    const report = await service.getAnnualInvoiceReport(context, year);

    if (format === "xlsx") {
      const buffer = serializeAnnualInvoiceXlsx(report);
      const filename = annualInvoiceFilename(year, "xlsx");

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // CSV
    const csv = serializeAnnualInvoiceCsv(report);
    const filename = annualInvoiceFilename(year, "csv");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Failed to export annual invoice report:", error);
    return new Response("Unable to export annual invoice report", { status: 500 });
  }
}
