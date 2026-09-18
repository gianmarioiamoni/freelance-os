// src/features/time-entries/TimeEntryList.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TimeEntryRecord, ClientRecord, ContractRecord } from "@/domain/persistence-types";
import Link from "next/link";
import { formatBillingModel } from "@/features/contracts/contract-display";
import { formatDurationToHoursMinutes } from "@/features/time-entries/time-entry-form-state";
import type { JSX } from "react";

type TimeEntryWithDetails = TimeEntryRecord & {
  client: ClientRecord;
  contract: ContractRecord;
};

type TimeEntryListProps = {
  entries: TimeEntryWithDetails[];
  date: Date;
};

function formatDuration(minutes: number): string {
  const { hours, minutes: mins } = formatDurationToHoursMinutes(minutes);
  const h = parseInt(hours) || 0;
  const m = parseInt(mins) || 0;
  
  if (h === 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

function formatBillableStatus(billable: boolean): string {
  return billable ? "Billable" : "Non-billable";
}

export function TimeEntryList({ entries, date }: TimeEntryListProps): JSX.Element {
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const billableMinutes = entries.reduce(
    (sum, entry) => sum + (entry.billable ? entry.durationMinutes : 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Daily Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{date.toLocaleDateString(undefined, { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
            <Button asChild size="sm">
              <Link href={`/time-tracking/new?date=${date.toISOString().split('T')[0]}`}>
                Add Entry
              </Link>
            </Button>
          </CardTitle>
          {entries.length > 0 && (
            <CardDescription>
              Total: {formatDuration(totalMinutes)} · 
              Billable: {formatDuration(billableMinutes)} · 
              Non-billable: {formatDuration(totalMinutes - billableMinutes)}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Time Entries */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <div className="text-center text-muted-foreground">
              <p>No time entries for this date.</p>
              <p className="mt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/time-tracking/new?date=${date.toISOString().split('T')[0]}`}>
                    Add your first entry
                  </Link>
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/clients/${entry.client.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {entry.client.companyName}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatDuration(entry.durationMinutes)}
                      </span>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/time-tracking/${entry.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {formatBillingModel(entry.contract.billingModel)} · {formatBillableStatus(entry.billable)}
                  </CardDescription>
                </CardHeader>
                {entry.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{entry.description}</p>
                  </CardContent>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}