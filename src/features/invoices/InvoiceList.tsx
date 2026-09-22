// src/features/invoices/InvoiceList.tsx
import type { InvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCalendarDate } from "@/features/contracts/contract-display";
import {
  formatInvoiceAmount,
  formatInvoiceAmountStatus,
  formatInvoiceDueDate,
  formatInvoiceOverdue,
  formatInvoiceTrackingState,
  invoiceDetailPath,
  invoiceListTitle,
} from "@/features/invoices/invoice-display";
import Link from "next/link";
import type { JSX } from "react";

type InvoiceListProps = {
  contractId: string;
  invoices: InvoiceDerivedView[];
};

export function InvoiceList({
  contractId,
  invoices,
}: InvoiceListProps): JSX.Element {
  return (
    <ul className="grid gap-3">
      {invoices.map((invoice) => {
        const overdueLabel = formatInvoiceOverdue(invoice.overdue);

        return (
          <li key={invoice.id}>
            <Card className={invoice.trackingState === "VOID" ? "opacity-80" : undefined}>
              <CardHeader>
                <CardTitle>
                  <Link
                    href={invoiceDetailPath(contractId, invoice.id)}
                    className="underline-offset-4 hover:underline"
                  >
                    {invoiceListTitle(invoice)}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {formatInvoiceTrackingState(invoice.trackingState)}
                  {overdueLabel ? ` · ${overdueLabel}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-1 text-muted-foreground">
                <p>{formatInvoiceAmount(invoice.amount, invoice.currency)}</p>
                <p>Paid {formatInvoiceAmount(invoice.paidAmount, invoice.currency)}</p>
                <p>Invoice date {formatCalendarDate(invoice.invoiceDate)}</p>
                <p>Due {formatInvoiceDueDate(invoice.dueDate)}</p>
                <p>{formatInvoiceAmountStatus(invoice.amountStatus)}</p>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
