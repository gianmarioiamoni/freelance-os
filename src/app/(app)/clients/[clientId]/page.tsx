// src/app/(app)/clients/[clientId]/page.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import { ClientDetail } from "@/features/clients/ClientDetail";
import { loadWorkspaceClient } from "@/features/clients/load-clients";
import { ClientContractHistory } from "@/features/contracts/ClientContractHistory";
import { getWorkspaceCalendarDate } from "@/features/contracts/contract-display";
import {
  loadContractWorkspace,
  loadWorkspaceContractsForClient,
} from "@/features/contracts/load-contracts";
import Link from "next/link";
import type { JSX } from "react";

type ClientDetailPageProps = {
  params: Promise<{
    clientId: string;
  }>;
  searchParams: Promise<{
    confirm?: string;
  }>;
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps): Promise<JSX.Element> {
  const { clientId } = await params;
  const { confirm } = await searchParams;
  const [client, contracts, workspace] = await Promise.all([
    loadWorkspaceClient(clientId),
    loadWorkspaceContractsForClient(clientId),
    loadContractWorkspace(),
  ]);

  return (
    <section className="max-w-2xl">
      <PageHeader title={client.companyName} />
      <PageContent>
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link
              href={
                client.status === "ARCHIVED"
                  ? "/clients?status=archived"
                  : "/clients"
              }
            >
              Back to clients
            </Link>
          </Button>
        </div>
        <div className="grid gap-8">
          <ClientDetail
            client={client}
            isConfirmingArchive={confirm === "archive"}
          />
          <ClientContractHistory
            client={client}
            contracts={contracts}
            today={getWorkspaceCalendarDate(workspace.timezone)}
          />
        </div>
      </PageContent>
    </section>
  );
}
