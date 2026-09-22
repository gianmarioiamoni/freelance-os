// src/features/invoices/InvoiceDetail.tsx
import type { InvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCalendarDate } from "@/features/contracts/contract-display";
import { VoidInvoiceForm } from "@/features/invoices/VoidInvoiceForm";
import {
  formatInvoiceAmount,
  formatInvoiceAmountStatus,
  formatInvoiceDueDate,
  formatInvoiceOutstanding,
  formatInvoiceOverdue,
  formatInvoicePaymentTerms,
  formatInvoiceTrackingState,
  invoiceDetailPath,
  invoiceEditPath,
} from "@/features/invoices/invoice-display";
import { displayOptionalText } from "@/features/clients/client-status";
import Link from "next/link";
import type { JSX } from "react";

type InvoiceDetailProps = {
  contractId: string;
  invoice: InvoiceDerivedView;
  isConfirmingVoid: boolean;
};

export function InvoiceDetail({
  contractId,
  invoice,
  isConfirmingVoid,
}: InvoiceDetailProps): JSX.Element {
  const isActive = invoice.trackingState === "ACTIVE";
  const overdueLabel = formatInvoiceOverdue(invoice.overdue);
  const fields = [
    { label: "Status", value: formatInvoiceTrackingState(invoice.trackingState) },
    { label: "Amount", value: formatInvoiceAmount(invoice.amount, invoice.currency) },
    { label: "Paid", value: formatInvoiceAmount(invoice.paidAmount, invoice.currency) },
    {
      label: "Outstanding",
      value: formatInvoiceOutstanding(invoice.amount, invoice.paidAmount, invoice.currency),
    },
    { label: "Currency", value: invoice.currency },
    { label: "Invoice date", value: formatCalendarDate(invoice.invoiceDate) },
    { label: "Reference", value: displayOptionalText(invoice.reference) },
    { label: "Payment terms", value: formatInvoicePaymentTerms(invoice.paymentTermsDays) },
    { label: "Due date", value: formatInvoiceDueDate(invoice.dueDate) },
    { label: "Payment status", value: formatInvoiceAmountStatus(invoice.amountStatus) },
    ...(overdueLabel ? [{ label: "Overdue", value: overdueLabel }] : []),
  ] as const;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Invoice tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4">
            {fields.map((field) => (
              <div key={field.label} className="grid gap-1">
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      {isActive && !isConfirmingVoid ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={invoiceEditPath(contractId, invoice.id)}>Edit</Link>
          </Button>
          <Button asChild variant="destructive">
            <Link href={`${invoiceDetailPath(contractId, invoice.id)}?confirm=void`}>
              Void
            </Link>
          </Button>
        </div>
      ) : null}
      {isActive && isConfirmingVoid ? (
        <VoidInvoiceForm contractId={contractId} invoiceId={invoice.id} />
      ) : null}
    </div>
  );
}
