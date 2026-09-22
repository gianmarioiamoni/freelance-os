// src/features/payments/InvoicePaymentSection.tsx
import type { InvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import type { PaymentRecord } from "@/domain/persistence-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/EmptyState";
import { DeletePaymentForm } from "@/features/payments/DeletePaymentForm";
import { PaymentList } from "@/features/payments/PaymentList";
import { paymentCreatePath } from "@/features/payments/payment-display";
import Link from "next/link";
import type { JSX } from "react";

type InvoicePaymentSectionProps = {
  contractId: string;
  invoice: InvoiceDerivedView;
  payments: PaymentRecord[];
  deletingPaymentId: string | null;
};

export function InvoicePaymentSection({
  contractId,
  invoice,
  payments,
  deletingPaymentId,
}: InvoicePaymentSectionProps): JSX.Element {
  const isActive = invoice.trackingState === "ACTIVE";
  const deletingPayment = deletingPaymentId
    ? payments.find((payment) => payment.id === deletingPaymentId)
    : undefined;
  const isWritable = isActive && !deletingPayment;

  return (
    <section className="grid gap-4" aria-labelledby="invoice-payments">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="invoice-payments">Payments</h2>
        {isWritable ? (
          <Button asChild>
            <Link href={paymentCreatePath(contractId, invoice.id)}>
              Record payment
            </Link>
          </Button>
        ) : null}
      </div>
      {isActive ? null : (
        <Alert>
          <AlertTitle>Invoice is void</AlertTitle>
          <AlertDescription>
            Payment history remains readable and cannot be changed.
          </AlertDescription>
        </Alert>
      )}
      {deletingPayment && isActive ? (
        <DeletePaymentForm
          contractId={contractId}
          invoiceId={invoice.id}
          paymentId={deletingPayment.id}
        />
      ) : null}
      {payments.length === 0 ? (
        <EmptyState
          title="No payments recorded"
          description="Payments recorded against this invoice will appear here."
        />
      ) : (
        <PaymentList
          contractId={contractId}
          invoiceId={invoice.id}
          payments={payments}
          isWritable={isWritable}
        />
      )}
    </section>
  );
}
