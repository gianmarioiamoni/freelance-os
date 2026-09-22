// src/app/(app)/contracts/[contractId]/invoices/[invoiceId]/edit/page.tsx
import { isActiveInvoice } from "@/domain/invoice";
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import { loadContractDetailPageData } from "@/features/contracts/load-contracts";
import { InvoiceForm } from "@/features/invoices/InvoiceForm";
import { invoiceDetailPath } from "@/features/invoices/invoice-display";
import { toInvoiceFormValues } from "@/features/invoices/invoice-form-state";
import { loadContractInvoice } from "@/features/invoices/load-invoices";
import { updateInvoiceAction } from "@/features/invoices/update-invoice-action";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { JSX } from "react";

type EditInvoicePageProps = {
  params: Promise<{
    contractId: string;
    invoiceId: string;
  }>;
};

export default async function EditInvoicePage({
  params,
}: EditInvoicePageProps): Promise<JSX.Element> {
  const { contractId, invoiceId } = await params;
  const [{ contract, client }, invoice] = await Promise.all([
    loadContractDetailPageData(contractId),
    loadContractInvoice(contractId, invoiceId),
  ]);

  if (!isActiveInvoice(invoice.voidedAt)) {
    redirect(invoiceDetailPath(contract.id, invoice.id));
  }

  const action = updateInvoiceAction.bind(null, contract.id, invoice.id);

  return (
    <section className="max-w-2xl">
      <PageHeader
        title="Edit invoice"
        description={client?.companyName ?? "Update this invoice."}
      />
      <PageContent>
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href={invoiceDetailPath(contract.id, invoice.id)}>
              Back to invoice
            </Link>
          </Button>
        </div>
        <InvoiceForm
          action={action}
          defaultValues={toInvoiceFormValues(invoice)}
          submitLabel="Save changes"
          pendingLabel="Saving changes…"
          currency={invoice.currency}
          paymentTermsDays={invoice.paymentTermsDays}
        />
      </PageContent>
    </section>
  );
}
