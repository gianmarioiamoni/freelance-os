// src/app/(app)/contracts/page.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { ContractList } from "@/features/contracts/ContractList";
import {
  getWorkspaceCalendarDate,
  toContractListItems,
} from "@/features/contracts/contract-display";
import { loadContractListPageData } from "@/features/contracts/load-contracts";
import Link from "next/link";
import type { JSX } from "react";

export default async function ContractsPage(): Promise<JSX.Element> {
  const { contracts, clients, activeClients, workspace } =
    await loadContractListPageData();
  const items = toContractListItems(
    contracts,
    clients,
    getWorkspaceCalendarDate(workspace.timezone),
  );
  const hasActiveClients = activeClients.length > 0;

  return (
    <section className="max-w-2xl">
      <PageHeader
        title="Contracts"
        description="Commercial agreements in this workspace."
      />
      <PageContent>
        <div className="mb-6 flex flex-wrap gap-2">
          {hasActiveClients ? (
            <Button asChild>
              <Link href="/contracts/new">New contract</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/clients/new">New client</Link>
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <EmptyState
            title="No contracts"
            description={
              hasActiveClients
                ? "Create a contract to record commercial terms for a client."
                : "Create a client before you can add a contract."
            }
          />
        ) : (
          <ContractList items={items} />
        )}
      </PageContent>
    </section>
  );
}
