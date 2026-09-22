// src/features/invoices/ContractInvoiceSection.tsx
import type { InvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { InvoiceList } from "@/features/invoices/InvoiceList";
import {
  formatTrackingFilterLabel,
  INVOICE_TRACKING_FILTERS,
  invoiceCreatePath,
  invoiceEmptyStateCopy,
  invoiceTrackingHref,
} from "@/features/invoices/invoice-display";
import type { InvoiceTrackingFilter } from "@/domain/persistence-types";
import Link from "next/link";
import type { JSX } from "react";

type ContractInvoiceSectionProps = {
  contractId: string;
  invoices: InvoiceDerivedView[];
  tracking: InvoiceTrackingFilter;
};

export function ContractInvoiceSection({
  contractId,
  invoices,
  tracking,
}: ContractInvoiceSectionProps): JSX.Element {
  const empty = invoiceEmptyStateCopy(tracking);

  return (
    <section className="grid gap-4" aria-labelledby="contract-invoices">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="contract-invoices">Invoices</h2>
        <Button asChild>
          <Link href={invoiceCreatePath(contractId)}>New invoice</Link>
        </Button>
      </div>
      <nav aria-label="Invoice status" className="flex flex-wrap gap-2">
        {INVOICE_TRACKING_FILTERS.map((filter) => (
          <Button
            key={filter}
            asChild
            variant={filter === tracking ? "default" : "outline"}
          >
            <Link
              href={invoiceTrackingHref(contractId, filter)}
              aria-current={filter === tracking ? "page" : undefined}
            >
              {formatTrackingFilterLabel(filter)}
            </Link>
          </Button>
        ))}
      </nav>
      {invoices.length === 0 ? (
        <EmptyState title={empty.title} description={empty.description} />
      ) : (
        <InvoiceList contractId={contractId} invoices={invoices} />
      )}
    </section>
  );
}
