// src/application/timesheet-viewer/get-viewer-dashboard.ts
import type {
  AnomalyReportRepository,
  TimeEntryRepository,
  ViewerAccessRepository,
} from "@/domain/repositories";
import {
  ViewerAccessNotFoundError,
  ViewerUnauthorizedError,
} from "@/domain/viewer-errors";
import type { TimeEntryRecord } from "@/domain/persistence-types";

export type ViewerDashboardData = {
  period: {
    month: number;
    year: number;
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    totalMinutes: number;
    billableMinutes: number;
    nonBillableMinutes: number;
    billablePercentage: number | null;
    workingDays: number;
    totalEntries: number;
    averageMinutesPerDay: number | null;
  };
  anomalies: {
    pendingCount: number;
  };
  dailyBreakdown: Array<{
    workDate: Date;
    totalMinutes: number;
    billableMinutes: number;
    entriesCount: number;
  }>;
};

type ViewerRepositories = {
  viewerAccess: ViewerAccessRepository;
  timeEntries: TimeEntryRepository;
  anomalyReports: AnomalyReportRepository;
};

export async function getViewerDashboard(
  workspaceId: string,
  viewerAccessId: string,
  month: number,
  year: number,
  repositories: ViewerRepositories,
): Promise<ViewerDashboardData> {
  // 1. Verify viewer is ACTIVE
  const viewer = await repositories.viewerAccess.getById(
    workspaceId,
    viewerAccessId,
  );
  if (!viewer || viewer.status !== "ACTIVE") {
    throw new ViewerAccessNotFoundError();
  }

  // 2. Get authorized contracts
  const authorizedContracts =
    await repositories.viewerAccess.listAuthorizedContracts(
      workspaceId,
      viewerAccessId,
    );

  if (authorizedContracts.length === 0) {
    throw new ViewerUnauthorizedError();
  }

  // 3. Calculate period
  const period = calculateMonthPeriod(year, month);

  // 4. Fetch time entries for period
  const allEntries = await repositories.timeEntries.listTimeEntriesForPeriod(
    workspaceId,
    period.startDate,
    period.endDate,
  );

  // 5. Filter by authorized contracts
  const authorizedContractIds = new Set(
    authorizedContracts.map((ac) => ac.contractId),
  );
  const entries = allEntries.filter((entry) =>
    authorizedContractIds.has(entry.contractId),
  );

  // 6. Fetch pending anomalies count
  const pendingAnomalies =
    await repositories.anomalyReports.listForViewerAccess(
      workspaceId,
      viewerAccessId,
      "OPEN",
    );

  // 7. Aggregate dashboard data
  return aggregateViewerDashboard(entries, period, pendingAnomalies.length);
}

function calculateMonthPeriod(
  year: number,
  month: number,
): { month: number; year: number; startDate: Date; endDate: Date } {
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return {
    month,
    year,
    startDate,
    endDate,
  };
}

function aggregateViewerDashboard(
  entries: TimeEntryRecord[],
  period: { month: number; year: number; startDate: Date; endDate: Date },
  pendingCount: number,
): ViewerDashboardData {
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const billableMinutes = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.durationMinutes, 0);

  const workingDays = new Set(
    entries.map((e) => e.workDate.toISOString()),
  ).size;

  const dailyBreakdown = groupByDay(entries);

  return {
    period,
    metrics: {
      totalMinutes,
      billableMinutes,
      nonBillableMinutes: totalMinutes - billableMinutes,
      billablePercentage:
        totalMinutes > 0 ? (billableMinutes / totalMinutes) * 100 : null,
      workingDays,
      totalEntries: entries.length,
      averageMinutesPerDay: workingDays > 0 ? totalMinutes / workingDays : null,
    },
    anomalies: {
      pendingCount,
    },
    dailyBreakdown,
  };
}

function groupByDay(
  entries: TimeEntryRecord[],
): Array<{
  workDate: Date;
  totalMinutes: number;
  billableMinutes: number;
  entriesCount: number;
}> {
  const grouped = new Map<
    string,
    { workDate: Date; totalMinutes: number; billableMinutes: number; count: number }
  >();

  for (const entry of entries) {
    const key = entry.workDate.toISOString();
    const existing = grouped.get(key);
    if (existing) {
      existing.totalMinutes += entry.durationMinutes;
      existing.billableMinutes += entry.billable ? entry.durationMinutes : 0;
      existing.count += 1;
    } else {
      grouped.set(key, {
        workDate: entry.workDate,
        totalMinutes: entry.durationMinutes,
        billableMinutes: entry.billable ? entry.durationMinutes : 0,
        count: 1,
      });
    }
  }

  return Array.from(grouped.values())
    .map((g) => ({
      workDate: g.workDate,
      totalMinutes: g.totalMinutes,
      billableMinutes: g.billableMinutes,
      entriesCount: g.count,
    }))
    .sort((a, b) => a.workDate.getTime() - b.workDate.getTime());
}
