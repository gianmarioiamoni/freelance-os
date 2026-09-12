// src/app/(app)/clients/[clientId]/edit/page.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/features/clients/ClientForm";
import { toClientFormValues } from "@/features/clients/client-form-state";
import { loadWorkspaceClient } from "@/features/clients/load-clients";
import { updateClientAction } from "@/features/clients/update-client-action";
import Link from "next/link";
import type { JSX } from "react";

type EditClientPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

export default async function EditClientPage({
  params,
}: EditClientPageProps): Promise<JSX.Element> {
  const { clientId } = await params;
  const client = await loadWorkspaceClient(clientId);
  const action = updateClientAction.bind(null, clientId);

  return (
    <section className="max-w-2xl">
      <PageHeader
        title="Edit client"
        description={client.companyName}
      />
      <PageContent>
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href={`/clients/${clientId}`}>Back to client</Link>
          </Button>
        </div>
        <ClientForm
          action={action}
          defaultValues={toClientFormValues(client)}
          submitLabel="Save changes"
          pendingLabel="Saving changes…"
        />
      </PageContent>
    </section>
  );
}
