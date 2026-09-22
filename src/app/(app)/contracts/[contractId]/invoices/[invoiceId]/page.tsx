// src/app/(app)/contracts/[contractId]/invoices/[invoiceId]/page.tsx
import { isActiveInvoice } from "@/domain/invoice";
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import { loadContractDetailPageData } from "@/features/contracts/load-contracts";
import { InvoiceDetail } from "@/features/invoices/InvoiceDetail";
import {
  formatInvoiceTrackingState,
  invoiceListTitle,
} from "@/features/invoices/invoice-display";
import { loadContractInvoice } from "@/features/invoices/load-invoices";
import Link from "next/link";
import type { JSX } from "react";

type InvoiceDetailPageProps = {
  params: Promise<{
    contractId: string;
    invoiceId: string;
  }>;
  searchParams: Promise<{
    confirm?: string;
  }>;
};

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: InvoiceDetailPageProps): Promise<JSX.Element> {
  const { contractId, invoiceId } = await params;
  const { confirm } = await searchParams;
  const [{ contract, client }, invoice] = await Promise.all([
    loadContractDetailPageData(contractId),
    loadContractInvoice(contractId, invoiceId),
  ]);
  const title = invoiceListTitle(invoice);
  const description = isActiveInvoice(invoice.voidedAt)
    ? (client?.companyName ?? "Invoice tracking")
    : `${formatInvoiceTrackingState(invoice.trackingState)} · ${client?.companyName ?? "Invoice tracking"}`;

  return (
    <section className="max-w-2xl">
      <PageHeader title={title} description={description} />
      <PageContent>
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href={`/contracts/${contract.id}`}>Back to contract</Link>
          </Button>
        </div>
        <InvoiceDetail
          contractId={contract.id}
          invoice={invoice}
          isConfirmingVoid={confirm === "void"}
        />
      </PageContent>
    </section>
  );
}
