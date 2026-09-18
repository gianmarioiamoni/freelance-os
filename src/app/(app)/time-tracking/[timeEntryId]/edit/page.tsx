// src/app/(app)/time-tracking/[timeEntryId]/edit/page.tsx
import { PageHeader } from "@/components/page/PageHeader";
import { PageContent } from "@/components/page/PageContent";
import { TimeEntryForm } from "@/features/time-entries/TimeEntryForm";
import { DeleteTimeEntryForm } from "@/features/time-entries/DeleteTimeEntryForm";
import { updateTimeEntryAction } from "@/features/time-entries/update-time-entry-action";
import { loadTimeEntry, loadClientsAndContracts } from "@/features/time-entries/load-time-entries";
import { formatBillingModel } from "@/features/contracts/contract-display";
import { formatDurationToHoursMinutes } from "@/features/time-entries/time-entry-form-state";
import { notFound } from "next/navigation";
import type { JSX } from "react";

type TimeTrackingEditPageProps = {
  params: Promise<{ timeEntryId: string }>;
};

export default async function TimeTrackingEditPage({
  params,
}: TimeTrackingEditPageProps): Promise<JSX.Element> {
  const { timeEntryId } = await params;

  try {
    const [timeEntry, { clients, contracts }] = await Promise.all([
      loadTimeEntry(timeEntryId),
      loadClientsAndContracts(),
    ]);

    // Find client and contract for readonly display
    const client = clients.find(c => c.id === timeEntry.clientId);
    const contract = contracts.find(c => c.id === timeEntry.contractId);

    // Format duration for form
    const { hours, minutes } = formatDurationToHoursMinutes(timeEntry.durationMinutes);

    // Prepare form values (only mutable fields for edit)
    const defaultValues = {
      clientId: timeEntry.clientId, // Read-only display
      contractId: timeEntry.contractId, // Read-only display
      workDate: timeEntry.workDate.toISOString().split('T')[0], // Read-only display
      durationHours: hours,
      durationMinutes: minutes,
      description: timeEntry.description || "",
      billable: timeEntry.billable,
    };

    // Create a bound action with the timeEntryId
    const boundUpdateAction = updateTimeEntryAction.bind(null, timeEntryId);

    return (
      <>
        <PageHeader
          title="Edit Time Entry"
          description={`Editing entry for ${client?.companyName || "Unknown Client"}`}
        />
        <PageContent>
          <div className="max-w-2xl space-y-8">
            <TimeEntryForm
              action={boundUpdateAction}
              defaultValues={defaultValues}
              submitLabel="Save Changes"
              pendingLabel="Saving..."
              clients={clients}
              contracts={contracts}
              isEdit={true}
              clientName={client?.companyName}
              contractDescription={contract ? 
                `${formatBillingModel(contract.billingModel)} · ${new Date(contract.validFrom).toLocaleDateString()} to ${contract.validTo ? new Date(contract.validTo).toLocaleDateString() : "ongoing"}` : 
                undefined
              }
            />
            
            <DeleteTimeEntryForm
              timeEntryId={timeEntryId}
              clientName={client?.companyName || "Unknown Client"}
              workDate={timeEntry.workDate.toISOString().split('T')[0]}
              description={timeEntry.description}
            />
          </div>
        </PageContent>
      </>
    );
  } catch {
    // If time entry not found or access denied, show 404
    notFound();
  }
}