// src/app/(app)/contracts/[contractId]/invoices/[invoiceId]/payments/new/page.tsx
import { isActiveInvoice } from "@/domain/invoice";
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import {
  formatCalendarDate,
  getWorkspaceCalendarDate,
} from "@/features/contracts/contract-display";
import { loadContractDetailPageData } from "@/features/contracts/load-contracts";
import { invoiceDetailPath } from "@/features/invoices/invoice-display";
import { loadContractInvoice } from "@/features/invoices/load-invoices";
import { createPaymentAction } from "@/features/payments/create-payment-action";
import { PaymentForm } from "@/features/payments/PaymentForm";
import { createEmptyPaymentFormValues } from "@/features/payments/payment-form-state";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { JSX } from "react";

type NewPaymentPageProps = {
  params: Promise<{
    contractId: string;
    invoiceId: string;
  }>;
};

export default async function NewPaymentPage({
  params,
}: NewPaymentPageProps): Promise<JSX.Element> {
  const { contractId, invoiceId } = await params;
  const [{ contract, client, workspace }, invoice] = await Promise.all([
    loadContractDetailPageData(contractId),
    loadContractInvoice(contractId, invoiceId),
  ]);

  if (!isActiveInvoice(invoice.voidedAt)) {
    redirect(invoiceDetailPath(contract.id, invoice.id));
  }

  const action = createPaymentAction.bind(null, contract.id, invoice.id);

  return (
    <section className="max-w-2xl">
      <PageHeader
        title="Record payment"
        description={client?.companyName ?? "Record a payment on this invoice."}
      />
      <PageContent>
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href={invoiceDetailPath(contract.id, invoice.id)}>
              Back to invoice
            </Link>
          </Button>
        </div>
        <PaymentForm
          action={action}
          defaultValues={createEmptyPaymentFormValues(
            formatCalendarDate(getWorkspaceCalendarDate(workspace.timezone)),
          )}
          submitLabel="Create payment"
          pendingLabel="Creating payment…"
          currency={invoice.currency}
        />
      </PageContent>
    </section>
  );
}
