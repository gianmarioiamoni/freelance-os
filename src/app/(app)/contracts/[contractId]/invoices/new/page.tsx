// src/app/(app)/contracts/[contractId]/invoices/new/page.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import {
  formatCalendarDate,
  getWorkspaceCalendarDate,
} from "@/features/contracts/contract-display";
import { loadContractDetailPageData } from "@/features/contracts/load-contracts";
import { createInvoiceAction } from "@/features/invoices/create-invoice-action";
import { InvoiceForm } from "@/features/invoices/InvoiceForm";
import { createEmptyInvoiceFormValues } from "@/features/invoices/invoice-form-state";
import Link from "next/link";
import type { JSX } from "react";

type NewInvoicePageProps = {
  params: Promise<{
    contractId: string;
  }>;
};

export default async function NewInvoicePage({
  params,
}: NewInvoicePageProps): Promise<JSX.Element> {
  const { contractId } = await params;
  const { contract, client, workspace } =
    await loadContractDetailPageData(contractId);
  const action = createInvoiceAction.bind(null, contract.id);

  return (
    <section className="max-w-2xl">
      <PageHeader
        title="New invoice"
        description={client?.companyName ?? "Record an invoice on this contract."}
      />
      <PageContent>
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href={`/contracts/${contract.id}`}>Back to contract</Link>
          </Button>
        </div>
        <InvoiceForm
          action={action}
          defaultValues={createEmptyInvoiceFormValues(
            formatCalendarDate(getWorkspaceCalendarDate(workspace.timezone)),
          )}
          submitLabel="Create invoice"
          pendingLabel="Creating invoice…"
          currency={contract.currency}
          paymentTermsDays={contract.paymentTermsDays}
          paymentTermsNote={contract.paymentTermsNote}
        />
      </PageContent>
    </section>
  );
}
