// src/app/(app)/reports/annual-invoices/route.ts
import { AnnualInvoiceReportService } from "@/application/invoices/annual-invoice-report";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { isNextRedirectError } from "@/lib/next-redirect-error";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<Response> {
  const context = await getCurrentWorkspaceContext();
  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");

  if (!yearParam) {
    return NextResponse.json(
      { error: "Year parameter required" },
      { status: 400 },
    );
  }

  const year = parseInt(yearParam, 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const repositories = createRepositories();
  const service = new AnnualInvoiceReportService(
    repositories.invoices,
    repositories.payments,
  );

  try {
    const report = await service.getAnnualInvoiceReport(context, year);
    return NextResponse.json(report);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Failed to fetch annual invoice report:", error);
    return NextResponse.json(
      { error: "Unable to fetch annual invoice report" },
      { status: 500 },
    );
  }
}
