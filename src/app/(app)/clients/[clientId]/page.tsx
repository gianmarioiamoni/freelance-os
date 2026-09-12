// src/app/(app)/clients/[clientId]/page.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import { ClientDetail } from "@/features/clients/ClientDetail";
import { loadWorkspaceClient } from "@/features/clients/load-clients";
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
  const client = await loadWorkspaceClient(clientId);

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
        <ClientDetail
          client={client}
          isConfirmingArchive={confirm === "archive"}
        />
      </PageContent>
    </section>
  );
}
