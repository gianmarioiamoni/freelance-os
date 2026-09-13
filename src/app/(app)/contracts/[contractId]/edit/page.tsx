// src/app/(app)/contracts/[contractId]/edit/page.tsx
import { listSupportedCurrencies } from "@/application/workspace/workspace-creation-input";
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import { ContractForm } from "@/features/contracts/ContractForm";
import { toContractFormValues } from "@/features/contracts/contract-form-state";
import { loadContractDetailPageData } from "@/features/contracts/load-contracts";
import { updateContractAction } from "@/features/contracts/update-contract-action";
import Link from "next/link";
import type { JSX } from "react";

type EditContractPageProps = {
  params: Promise<{
    contractId: string;
  }>;
};

export default async function EditContractPage({
  params,
}: EditContractPageProps): Promise<JSX.Element> {
  const { contractId } = await params;
  const { contract, client, workspace } =
    await loadContractDetailPageData(contractId);
  const action = updateContractAction.bind(null, contractId);

  return (
    <section className="max-w-2xl">
      <PageHeader
        title="Edit contract"
        description={client?.companyName ?? "Commercial terms"}
      />
      <PageContent>
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href={`/contracts/${contractId}`}>Back to contract</Link>
          </Button>
        </div>
        <ContractForm
          action={action}
          defaultValues={toContractFormValues(contract, workspace.currency)}
          submitLabel="Save changes"
          pendingLabel="Saving changes…"
          currencies={listSupportedCurrencies()}
          clientName={
            client
              ? client.status === "ARCHIVED"
                ? `${client.companyName} (Archived)`
                : client.companyName
              : "Client unavailable"
          }
        />
      </PageContent>
    </section>
  );
}
