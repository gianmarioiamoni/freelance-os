// src/app/(app)/time-tracking/new/page.tsx
import { PageHeader } from "@/components/page/PageHeader";
import { PageContent } from "@/components/page/PageContent";
import { TimeEntryForm } from "@/features/time-entries/TimeEntryForm";
import { createTimeEntryAction } from "@/features/time-entries/create-time-entry-action";
import { clientsSelectableForCreate } from "@/features/time-entries/attach-time-entry-details";
import { loadClientsAndContracts } from "@/features/time-entries/load-time-entries";
import { EMPTY_TIME_ENTRY_FORM_VALUES } from "@/features/time-entries/time-entry-form-state";
import type { JSX } from "react";

type TimeTrackingNewPageProps = {
  searchParams: Promise<{ date?: string; clientId?: string; contractId?: string }>;
};

export default async function TimeTrackingNewPage({
  searchParams,
}: TimeTrackingNewPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  const { clients, contracts } = await loadClientsAndContracts();

  // Pre-populate form with query parameters
  const defaultValues = {
    ...EMPTY_TIME_ENTRY_FORM_VALUES,
    workDate: params.date || EMPTY_TIME_ENTRY_FORM_VALUES.workDate,
    clientId: params.clientId || "",
    contractId: params.contractId || "",
  };

  return (
    <>
      <PageHeader
        title="Add Time Entry"
        description="Record time spent on client work"
      />
      <PageContent>
        <div className="max-w-2xl">
          <TimeEntryForm
            action={createTimeEntryAction}
            defaultValues={defaultValues}
            submitLabel="Create Entry"
            pendingLabel="Creating..."
            clients={clientsSelectableForCreate(clients)}
            contracts={contracts}
          />
        </div>
      </PageContent>
    </>
  );
}