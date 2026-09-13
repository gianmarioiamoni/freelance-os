// src/app/(app)/contracts/[contractId]/page.tsx
import { deriveContractApplicability } from "@/application/contracts/contract-validity";
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import { ContractDetail } from "@/features/contracts/ContractDetail";
import { getWorkspaceCalendarDate } from "@/features/contracts/contract-display";
import { loadContractDetailPageData } from "@/features/contracts/load-contracts";
import Link from "next/link";
import type { JSX } from "react";

type ContractDetailPageProps = {
  params: Promise<{
    contractId: string;
  }>;
};

export default async function ContractDetailPage({
  params,
}: ContractDetailPageProps): Promise<JSX.Element> {
  const { contractId } = await params;
  const { contract, client, workspace } =
    await loadContractDetailPageData(contractId);
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
        <ContractDetail
          contract={contract}
          client={client}
          applicability={applicability}
          timezone={workspace.timezone}
        />
      </PageContent>
    </section>
  );
}
