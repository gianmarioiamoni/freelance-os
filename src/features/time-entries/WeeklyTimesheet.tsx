// src/features/time-entries/WeeklyTimesheet.tsx
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
import { formatDurationToHoursMinutes } from "@/features/time-entries/time-entry-form-state";
import type { JSX } from "react";

type TimeEntryWithDetails = TimeEntryRecord & {
  client: ClientRecord;
  contract: ContractRecord;
};

type WeeklyTimesheetProps = {
  entries: TimeEntryWithDetails[];
  weekStart: Date;
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

function getWeekDates(weekStart: Date): Date[] {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function WeeklyTimesheet({ entries, weekStart }: WeeklyTimesheetProps): JSX.Element {
  const weekDates = getWeekDates(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  // Group entries by date
  const entriesByDate = entries.reduce((acc, entry) => {
    const dateKey = getDateKey(new Date(entry.workDate));
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, TimeEntryWithDetails[]>);

  // Calculate totals
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const billableMinutes = entries.reduce(
    (sum, entry) => sum + (entry.billable ? entry.durationMinutes : 0),
    0
  );

  // Calculate daily totals
  const dailyTotals = weekDates.map(date => {
    const dateKey = getDateKey(date);
    const dayEntries = entriesByDate[dateKey] || [];
    const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
    const dayBillable = dayEntries.reduce(
      (sum, entry) => sum + (entry.billable ? entry.durationMinutes : 0),
      0
    );
    return { date, total: dayTotal, billable: dayBillable, entries: dayEntries };
  });

  return (
    <div className="space-y-4">
      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Week of {weekStart.toLocaleDateString(undefined, { 
                month: 'long', 
                day: 'numeric' 
              })} - {weekEnd.toLocaleDateString(undefined, { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
            <Button asChild size="sm">
              <Link href="/time-tracking/new">
                Add Entry
              </Link>
            </Button>
          </CardTitle>
          <CardDescription>
            Week Total: {formatDuration(totalMinutes)} · 
            Billable: {formatDuration(billableMinutes)} · 
            Non-billable: {formatDuration(totalMinutes - billableMinutes)}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Daily Breakdown */}
      <div className="grid gap-4">
        {dailyTotals.map(({ date, total, billable, entries: dayEntries }) => {
          const dateKey = getDateKey(date);
          const isToday = dateKey === getDateKey(new Date());
          
          return (
            <Card key={dateKey} className={isToday ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <div>
                    <Link
                      href={`/time-tracking?date=${dateKey}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {date.toLocaleDateString(undefined, { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                      {isToday ? " (Today)" : ""}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    {total > 0 && (
                      <span className="text-sm">
                        {formatDuration(total)}
                      </span>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/time-tracking/new?date=${dateKey}`}>
                        Add
                      </Link>
                    </Button>
                  </div>
                </CardTitle>
                {total > 0 && (
                  <CardDescription>
                    Billable: {formatDuration(billable)} · 
                    Non-billable: {formatDuration(total - billable)}
                  </CardDescription>
                )}
              </CardHeader>
              {dayEntries.length > 0 && (
                <CardContent>
                  <ul className="space-y-2">
                    {dayEntries.map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{entry.client.companyName}</span>
                          <span className="text-muted-foreground"> · {formatDuration(entry.durationMinutes)}</span>
                          <span className="text-muted-foreground"> · {entry.billable ? "Billable" : "Non-billable"}</span>
                        </div>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/time-tracking/${entry.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}