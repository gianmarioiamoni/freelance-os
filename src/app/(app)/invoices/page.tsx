// src/app/(app)/invoices/page.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { ErrorState } from "@/components/states/ErrorState";
import { WorkspaceInvoiceFilters } from "@/features/invoices/WorkspaceInvoiceFilters";
import { WorkspaceInvoiceTable } from "@/features/invoices/WorkspaceInvoiceTable";
import { loadWorkspaceInvoicesPageData } from "@/features/invoices/load-workspace-invoices";
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
        <PageHeader
          title="Invoices"
          description="Workspace invoice tracking across contracts."
        />
        <PageContent>
          <ErrorState message="Unable to load invoices. Please try again later." />
        </PageContent>
      </section>
    );
  }

  return (
    <section className="max-w-6xl">
      <PageHeader
        title="Invoices"
        description={`Workspace invoice tracking - ${data.periodLabel}`}
      />
      <PageContent>
        <div className="grid gap-6">
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
