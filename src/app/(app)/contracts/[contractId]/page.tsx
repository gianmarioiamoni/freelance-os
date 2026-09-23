// src/app/(app)/contracts/[contractId]/page.tsx
import { deriveContractApplicability } from "@/application/contracts/contract-validity";
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import { ContractAllocationDetail } from "@/features/contracts/ContractAllocationDetail";
import { ContractDetail } from "@/features/contracts/ContractDetail";
import { getWorkspaceCalendarDate } from "@/features/contracts/contract-display";
import {
  loadContractAllocation,
  loadContractDetailPageData,
} from "@/features/contracts/load-contracts";
import { ContractInvoiceSection } from "@/features/invoices/ContractInvoiceSection";
import { readInvoiceTrackingParam } from "@/features/invoices/invoice-display";
import { loadContractInvoices } from "@/features/invoices/load-invoices";
import Link from "next/link";
import type { JSX } from "react";

type ContractDetailPageProps = {
  params: Promise<{
    contractId: string;
  }>;
  searchParams: Promise<{
    tracking?: string;
  }>;
};

export default async function ContractDetailPage({
  params,
  searchParams,
}: ContractDetailPageProps): Promise<JSX.Element> {
  const { contractId } = await params;
  const { tracking: trackingParam } = await searchParams;
  const tracking = readInvoiceTrackingParam(trackingParam);
  const [{ contract, client, workspace }, invoices, allocation] = await Promise.all([
    loadContractDetailPageData(contractId),
    loadContractInvoices(contractId, trackingParam),
    loadContractAllocation(contractId),
  ]);
  const applicability = deriveContractApplicability(
    contract.validFrom,
    contract.validTo,
    getWorkspaceCalendarDate(workspace.timezone),
  );

  return (
    <section className="max-w-2xl">
      <PageHeader
        title={client?.companyName ?? "Contract"}
        description="Commercial terms for this contract."
      />
      <PageContent>
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href="/contracts">Back to contracts</Link>
          </Button>
        </div>
        <div className="grid gap-8">
          <ContractDetail
            contract={contract}
            client={client}
            applicability={applicability}
            timezone={workspace.timezone}
          />
          <ContractAllocationDetail allocation={allocation} />
          <ContractInvoiceSection
            contractId={contract.id}
            invoices={invoices}
            tracking={tracking}
          />
        </div>
      </PageContent>
    </section>
  );
}
