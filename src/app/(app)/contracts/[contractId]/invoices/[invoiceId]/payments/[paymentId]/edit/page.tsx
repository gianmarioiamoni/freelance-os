// src/app/(app)/contracts/[contractId]/invoices/[invoiceId]/payments/[paymentId]/edit/page.tsx
import { isActiveInvoice } from "@/domain/invoice";
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import { loadContractDetailPageData } from "@/features/contracts/load-contracts";
import { invoiceDetailPath } from "@/features/invoices/invoice-display";
import { loadContractInvoice } from "@/features/invoices/load-invoices";
import { loadContractInvoicePayment } from "@/features/payments/load-payments";
import { PaymentForm } from "@/features/payments/PaymentForm";
import { toPaymentFormValues } from "@/features/payments/payment-form-state";
import { updatePaymentAction } from "@/features/payments/update-payment-action";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { JSX } from "react";

type EditPaymentPageProps = {
  params: Promise<{
    contractId: string;
    invoiceId: string;
    paymentId: string;
  }>;
};

export default async function EditPaymentPage({
  params,
}: EditPaymentPageProps): Promise<JSX.Element> {
  const { contractId, invoiceId, paymentId } = await params;
  const [{ contract, client }, invoice, payment] = await Promise.all([
    loadContractDetailPageData(contractId),
    loadContractInvoice(contractId, invoiceId),
    loadContractInvoicePayment(contractId, invoiceId, paymentId),
  ]);

  if (!isActiveInvoice(invoice.voidedAt)) {
    redirect(invoiceDetailPath(contract.id, invoice.id));
  }

  const action = updatePaymentAction.bind(null, contract.id, invoice.id, payment.id);

  return (
    <section className="max-w-2xl">
      <PageHeader
        title="Edit payment"
        description={client?.companyName ?? "Update this payment."}
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
          defaultValues={toPaymentFormValues(payment)}
          submitLabel="Save changes"
          pendingLabel="Saving changes…"
          currency={payment.currency}
        />
      </PageContent>
    </section>
  );
}
