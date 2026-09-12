// src/app/(app)/clients/page.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { ClientList } from "@/features/clients/ClientList";
import { loadWorkspaceClients } from "@/features/clients/load-clients";
import Link from "next/link";
import type { JSX } from "react";

type ClientsPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

export default async function ClientsPage({
  searchParams,
}: ClientsPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  const isArchived = params.status === "archived";
  const clients = await loadWorkspaceClients(
    isArchived ? "ARCHIVED" : "ACTIVE",
  );

  return (
    <section className="max-w-2xl">
      <PageHeader
        title="Clients"
        description={
          isArchived
            ? "Archived clients in this workspace."
            : "Active clients in this workspace."
        }
      />
      <PageContent>
        <div className="mb-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/clients/new">New client</Link>
          </Button>
          {isArchived ? (
            <Button asChild variant="outline">
              <Link href="/clients">View active clients</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/clients?status=archived">View archived clients</Link>
            </Button>
          )}
        </div>
        {clients.length === 0 ? (
          <EmptyState
            title={
              isArchived ? "No archived clients" : "No active clients"
            }
            description={
              isArchived
                ? "Archived clients will appear here."
                : "Create a client to start managing customer master data."
            }
          />
        ) : (
          <ClientList clients={clients} />
        )}
      </PageContent>
    </section>
  );
}
