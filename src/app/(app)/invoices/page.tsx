// src/app/(app)/invoices/page.tsx
import { PageContent } from "@/components/page/PageContent";
import { ErrorState } from "@/components/states/ErrorState";
import { WorkspaceInvoiceFilters } from "@/features/invoices/WorkspaceInvoiceFilters";
import { WorkspaceInvoiceTable } from "@/features/invoices/WorkspaceInvoiceTable";
import { loadWorkspaceInvoicesPageData } from "@/features/invoices/load-workspace-invoices";
import { RevenueSummary } from "@/features/reporting/RevenueSummary";
import { ReportCsvExportLink } from "@/features/reporting/ReportCsvExportLink";
import { ReportExcelExportButton } from "@/features/reporting/ReportExcelExportButton";
import { ReportPdfExportButton } from "@/features/reporting/ReportPdfExportButton";
import type { JSX } from "react";

type InvoicesPageProps = {
  searchParams: Promise<{
    period?: string;
    start?: string;
    end?: string;
    tracking?: string;
    clientId?: string;
  }>;
};

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps): Promise<JSX.Element> {
  const params = await searchParams;

  let data;

  try {
    data = await loadWorkspaceInvoicesPageData(params);
  } catch {
    return (
      <section className="max-w-6xl">
        <header className="grid gap-1 mb-6">
          <h1>Invoices</h1>
          <p className="muted">Workspace invoice tracking across contracts.</p>
        </header>
        <PageContent>
          <ErrorState message="Unable to load invoices. Please try again later." />
        </PageContent>
      </section>
    );
  }

  return (
    <section className="max-w-6xl">
      <header className="grid gap-1 mb-6">
        <h1>Invoices</h1>
        <p className="muted">{`Workspace invoice tracking - ${data.periodLabel}`}</p>
        <nav
          aria-label="Invoice exports"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2"
        >
          <ReportCsvExportLink period={data.view.period} filter={{}} />
          <ReportExcelExportButton period={data.view.period} filter={{}} />
          <ReportPdfExportButton period={data.view.period} filter={{}} />
        </nav>
      </header>
      <PageContent>
        <div className="grid gap-6">
          <section aria-labelledby="invoice-revenue-heading">
            <h2 id="invoice-revenue-heading" className="text-base font-semibold mb-3">
              Revenue
            </h2>
            <RevenueSummary
              accrued={data.revenueOverview.accrued}
              expected={data.revenueOverview.expected}
              forecast={data.revenueOverview.forecast}
              invoiced={data.revenueOverview.invoiced}
              paid={data.revenueOverview.paid}
              outstanding={data.revenueOverview.outstanding}
            />
          </section>
          <WorkspaceInvoiceFilters view={data.view} clients={data.clients} />
          <WorkspaceInvoiceTable
            invoices={data.invoices}
            contractLabels={data.contractLabels}
            tracking={data.view.tracking}
          />
        </div>
      </PageContent>
    </section>
  );
}
