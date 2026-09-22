// src/features/payments/PaymentList.tsx
import type { PaymentRecord } from "@/domain/persistence-types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCalendarDate } from "@/features/contracts/contract-display";
import { formatInvoiceAmount } from "@/features/invoices/invoice-display";
import {
  paymentDeleteConfirmHref,
  paymentEditPath,
  paymentNotesText,
} from "@/features/payments/payment-display";
import Link from "next/link";
import type { JSX } from "react";

type PaymentListProps = {
  contractId: string;
  invoiceId: string;
  payments: PaymentRecord[];
  isWritable: boolean;
};

export function PaymentList({
  contractId,
  invoiceId,
  payments,
  isWritable,
}: PaymentListProps): JSX.Element {
  return (
    <ul className="grid gap-3">
      {payments.map((payment) => {
        const notes = paymentNotesText(payment.notes);

        return (
          <li key={payment.id}>
            <Card>
              <CardHeader>
                <CardTitle>{formatCalendarDate(payment.paymentDate)}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <p>{formatInvoiceAmount(payment.amount, payment.currency)}</p>
                {notes ? <p className="text-muted-foreground">{notes}</p> : null}
                {isWritable ? (
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={paymentEditPath(contractId, invoiceId, payment.id)}>
                        Edit payment
                      </Link>
                    </Button>
                    <Button asChild variant="destructive" size="sm">
                      <Link
                        href={paymentDeleteConfirmHref(
                          contractId,
                          invoiceId,
                          payment.id,
                        )}
                      >
                        Delete payment
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
