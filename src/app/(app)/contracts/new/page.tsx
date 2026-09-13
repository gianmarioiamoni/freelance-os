// src/app/(app)/contracts/new/page.tsx
import { listSupportedCurrencies } from "@/application/workspace/workspace-creation-input";
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { ContractForm } from "@/features/contracts/ContractForm";
import { createContractAction } from "@/features/contracts/create-contract-action";
import { createEmptyContractFormValues } from "@/features/contracts/contract-form-state";
import { loadContractCreatePageData } from "@/features/contracts/load-contracts";
import Link from "next/link";
import type { JSX } from "react";

type NewContractPageProps = {
  searchParams: Promise<{
    clientId?: string;
  }>;
};

export default async function NewContractPage({
  searchParams,
}: NewContractPageProps): Promise<JSX.Element> {
  const { clientId } = await searchParams;
  const { activeClients, selectedClient, workspace } =
    await loadContractCreatePageData(clientId);
  const currencies = listSupportedCurrencies();

  return (
    <section className="max-w-2xl">
      <PageHeader
        title="New contract"
        description="Add commercial terms for a client in this workspace."
      />
      <PageContent>
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href="/contracts">Back to contracts</Link>
          </Button>
        </div>
        {activeClients.length === 0 ? (
          <EmptyState
            title="No active clients"
            description="Create a client before you can add a contract."
          />
        ) : (
          <ContractForm
            action={createContractAction}
            defaultValues={createEmptyContractFormValues(
              workspace.currency,
              selectedClient?.id ?? "",
            )}
            submitLabel="Create contract"
            pendingLabel="Creating contract…"
            currencies={currencies}
            clients={activeClients}
            lockedClient={
              selectedClient
                ? {
                    id: selectedClient.id,
                    companyName: selectedClient.companyName,
                  }
                : undefined
            }
          />
        )}
        {activeClients.length === 0 ? (
          <div className="mt-4">
            <Button asChild>
              <Link href="/clients/new">New client</Link>
            </Button>
          </div>
        ) : null}
      </PageContent>
    </section>
  );
}
