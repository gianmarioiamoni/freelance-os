// src/app/(app)/time-tracking/page.tsx
import { PageHeader } from "@/components/page/PageHeader";
import { PageContent } from "@/components/page/PageContent";
import { Button } from "@/components/ui/button";
import { TimeEntryList } from "@/features/time-entries/TimeEntryList";
import { WeeklyTimesheet } from "@/features/time-entries/WeeklyTimesheet";
import { loadTimeEntriesForDate, loadTimeEntriesForWeek, loadClientsAndContracts } from "@/features/time-entries/load-time-entries";
import { getWeekStartFromDate } from "@/lib/analytics-periods";
import Link from "next/link";
import type { JSX } from "react";

type TimeTrackingPageProps = {
  searchParams: Promise<{ date?: string; view?: string; start?: string }>;
};

function parseDate(dateString?: string): Date {
  if (!dateString) return new Date();
  
  try {
    const date = new Date(dateString + "T00:00:00.000Z");
    return isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
}


function getPreviousDate(date: Date): string {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  return prev.toISOString().split('T')[0];
}

function getNextDate(date: Date): string {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next.toISOString().split('T')[0];
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function getPreviousWeek(weekStart: Date): string {
  const prev = new Date(weekStart);
  prev.setDate(prev.getDate() - 7);
  return prev.toISOString().split('T')[0];
}

function getNextWeek(weekStart: Date): string {
  const next = new Date(weekStart);
  next.setDate(next.getDate() + 7);
  return next.toISOString().split('T')[0];
}

export default async function TimeTrackingPage({
  searchParams,
}: TimeTrackingPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  const view = params.view === "week" ? "week" : "day";
  const selectedDate = parseDate(params.date || params.start);
  
  if (view === "week") {
    const weekStart = params.start ? parseDate(params.start) : getWeekStartFromDate(selectedDate);
    const [timeEntries, { clients, contracts }] = await Promise.all([
      loadTimeEntriesForWeek(weekStart),
      loadClientsAndContracts(),
    ]);

    // Enhance entries with client and contract details
    const entriesWithDetails = timeEntries.map(entry => ({
      ...entry,
      client: clients.find(c => c.id === entry.clientId)!,
      contract: contracts.find(c => c.id === entry.contractId)!,
    })).filter(entry => entry.client && entry.contract);

    const prevWeek = getPreviousWeek(weekStart);
    const nextWeek = getNextWeek(weekStart);

    return (
      <>
        <PageHeader 
          title="Time Tracking" 
          description="Weekly timesheet view"
        />
        <PageContent>
          <div className="mb-6 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/time-tracking?view=week&start=${prevWeek}`}>
                Previous Week
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/time-tracking">
                Today
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/time-tracking?view=week&start=${nextWeek}`}>
                Next Week
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/time-tracking?date=${getTodayISO()}`}>
                Daily View
              </Link>
            </Button>
          </div>
          <WeeklyTimesheet entries={entriesWithDetails} weekStart={weekStart} />
        </PageContent>
      </>
    );
  }

  // Daily view
  const [timeEntries, { clients, contracts }] = await Promise.all([
    loadTimeEntriesForDate(selectedDate),
    loadClientsAndContracts(),
  ]);

  // Enhance entries with client and contract details
  const entriesWithDetails = timeEntries.map(entry => ({
    ...entry,
    client: clients.find(c => c.id === entry.clientId)!,
    contract: contracts.find(c => c.id === entry.contractId)!,
  })).filter(entry => entry.client && entry.contract);

  const prevDay = getPreviousDate(selectedDate);
  const nextDay = getNextDate(selectedDate);
  const weekStart = getWeekStartFromDate(selectedDate);

  return (
    <>
      <PageHeader 
        title="Time Tracking" 
        description="Daily time entry view"
      />
      <PageContent>
        <div className="mb-6 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/time-tracking?date=${prevDay}`}>
              Previous Day
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/time-tracking">
              Today
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/time-tracking?date=${nextDay}`}>
              Next Day
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/time-tracking?view=week&start=${weekStart.toISOString().split('T')[0]}`}>
              Weekly View
            </Link>
          </Button>
        </div>
        <TimeEntryList entries={entriesWithDetails} date={selectedDate} />
      </PageContent>
    </>
  );
}
