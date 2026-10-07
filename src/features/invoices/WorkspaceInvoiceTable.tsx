// src/features/invoices/WorkspaceInvoiceTable.tsx
import type { WorkspaceInvoiceListItem } from "@/application/invoices/workspace-invoice-service";
import { EmptyState } from "@/components/states/EmptyState";
import { formatCalendarDate } from "@/features/contracts/contract-display";
import {
  formatInvoiceAmount,
  formatInvoiceAmountStatus,
  formatInvoiceDueDate,
  formatInvoiceOutstanding,
  formatInvoiceOverdue,
  formatInvoiceTrackingState,
  invoiceDetailPath,
  invoiceListTitle,
} from "@/features/invoices/invoice-display";
import { workspaceInvoiceEmptyCopy } from "@/features/invoices/workspace-invoice-filters";
import type { InvoiceTrackingFilter } from "@/domain/persistence-types";
import Link from "next/link";
import type { JSX } from "react";

type WorkspaceInvoiceTableProps = {
  invoices: WorkspaceInvoiceListItem[];
  contractLabels: Record<string, string>;
  tracking: InvoiceTrackingFilter;
};

export function WorkspaceInvoiceTable({
  invoices,
  contractLabels,
  tracking,
}: WorkspaceInvoiceTableProps): JSX.Element {
  if (invoices.length === 0) {
    const empty = workspaceInvoiceEmptyCopy(tracking);
    return <EmptyState title={empty.title} description={empty.description} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="mb-2 text-left text-base font-semibold">
          Workspace invoices
        </caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="py-2 pr-4 text-left font-medium">
              Invoice date
            </th>
            <th scope="col" className="py-2 pr-4 text-left font-medium">
              Client
            </th>
            <th scope="col" className="py-2 pr-4 text-left font-medium">
              Contract
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              Amount
            </th>
            <th scope="col" className="py-2 pr-4 text-left font-medium">
              Currency
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              Paid
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              Outstanding
            </th>
            <th scope="col" className="py-2 pr-4 text-left font-medium">
              Status
            </th>
            <th scope="col" className="py-2 text-left font-medium">
              Due date
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const overdueLabel = formatInvoiceOverdue(invoice.overdue);
            const contractLabel =
              contractLabels[invoice.contractId] ?? "Contract unavailable";
            const detailHref = invoiceDetailPath(invoice.contractId, invoice.id);

            return (
              <tr
                key={invoice.id}
                className={
                  invoice.trackingState === "VOID"
                    ? "border-b opacity-80 last:border-0"
                    : "border-b last:border-0"
                }
              >
                <td className="py-2 pr-4">
                  <Link
                    href={detailHref}
                    className="font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {formatCalendarDate(invoice.invoiceDate)}
                  </Link>
                  {invoice.reference ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {invoiceListTitle(invoice)}
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-4">
                  <span
                    className="inline-block max-w-[10rem] truncate align-bottom"
                    title={invoice.clientName}
                  >
                    {invoice.clientName}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <Link
                    href={`/contracts/${invoice.contractId}`}
                    className="inline-block max-w-[12rem] truncate align-bottom underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    title={contractLabel}
                  >
                    {contractLabel}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {formatInvoiceAmount(invoice.amount, invoice.currency)}
                </td>
                <td className="py-2 pr-4">{invoice.currency}</td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {formatInvoiceAmount(invoice.paidAmount, invoice.currency)}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {formatInvoiceOutstanding(
                    invoice.amount,
                    invoice.paidAmount,
                    invoice.currency,
                  )}
                </td>
                <td className="py-2 pr-4">
                  <div className="grid gap-1">
                    <span>{formatInvoiceAmountStatus(invoice.amountStatus)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatInvoiceTrackingState(invoice.trackingState)}
                    </span>
                    {overdueLabel ? (
                      <span
                        className="text-xs text-destructive"
                        aria-label="Overdue"
                      >
                        {overdueLabel}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="py-2">{formatInvoiceDueDate(invoice.dueDate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
