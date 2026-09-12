// src/app/(app)/clients/new/page.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/features/clients/ClientForm";
import { createClientAction } from "@/features/clients/create-client-action";
import Link from "next/link";
import type { JSX } from "react";

export default function NewClientPage(): JSX.Element {
  return (
    <section className="max-w-2xl">
      <PageHeader
        title="New client"
        description="Add customer master data for this workspace."
      />
      <PageContent>
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href="/clients">Back to clients</Link>
          </Button>
        </div>
        <ClientForm
          action={createClientAction}
          submitLabel="Create client"
          pendingLabel="Creating client…"
        />
      </PageContent>
    </section>
  );
}
