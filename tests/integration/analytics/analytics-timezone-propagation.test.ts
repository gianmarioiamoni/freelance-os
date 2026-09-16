// tests/integration/analytics/analytics-timezone-propagation.test.ts
//
// F-105-004: Integration proof that a persisted Workspace.timezone propagates
// through the complete production path:
//
//   WorkspaceRecord.timezone (persisted)
//   → resolveWorkspaceContext (fetches workspace record)
//   → WorkspaceContext.timezone
//   → AnalyticsService.getCurrentMonthAnalytics
//   → getCurrentMonthPeriod(context.timezone)
//   → period boundary follows workspace-local today, not UTC today
//
// Scenario (BR-105-014 / BR-105-015):
//   - Process/server clock pinned to 2026-09-16T01:00:00Z (UTC)
//   - UTC date:              2026-09-16
//   - America/New_York date: 2026-09-15  (UTC-4 EDT)
//   - Workspace timezone:    America/New_York
//   - Expected period end:   2026-09-15 (workspace-local today)
//   - Rejected period end:   2026-09-16 (UTC today — must NOT appear)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { resolveWorkspaceContext } from "@/application/workspace/resolve-workspace-context";
import { repositories } from "../persistence/helpers";
import { date } from "../persistence/helpers";

const CLOCK_UTC = new Date("2026-09-16T01:00:00.000Z");
// At this instant: UTC = Sep 16, America/New_York (EDT, UTC-4) = Sep 15

describe("Analytics timezone propagation — F-105-004 (BR-105-014)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(CLOCK_UTC);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("period end follows Workspace.timezone (America/New_York), not UTC", async () => {
    // 1. Persist workspace with non-UTC timezone
    const workspace = await repositories.workspaces.createWorkspace({
      name: "NY Timezone Workspace",
      timezone: "America/New_York",
      currency: "USD",
    });

    const userId = "tz-test-user-ny";

    await repositories.members.addMember({
      workspaceId: workspace.id,
      userId,
      role: "OWNER",
    });

    // 2. Resolve context through the real application path (fetches workspace record)
    const resolution = await resolveWorkspaceContext(
      userId,
      repositories.members,
      repositories.workspaces,
    );

    expect(resolution.status).toBe("resolved");
    if (resolution.status !== "resolved") return;

    const context = resolution.context;

    // 3. Assert timezone was propagated from the persisted record
    expect(context.timezone).toBe("America/New_York");

    // 4. Seed a time entry on 2026-09-15 (workspace-local today)
    const client = await repositories.clients.createClient(workspace.id, {
      companyName: "NY Client",
    });
    const contract = await repositories.contracts.createContract(workspace.id, {
      clientId: client.id,
      validFrom: date("2026-09-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "USD",
    });
    await repositories.timeEntries.recordTimeEntry(workspace.id, {
      userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: date("2026-09-15"), // workspace-local today
      durationMinutes: 240,
      billable: true,
    });

    // 5. Also seed an entry on 2026-09-16 (UTC today, but NOT workspace-local today)
    await repositories.timeEntries.recordTimeEntry(workspace.id, {
      userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: date("2026-09-16"), // UTC today — must be EXCLUDED by workspace timezone
      durationMinutes: 120,
      billable: true,
    });

    // 6. Call analytics via the real AnalyticsService
    const analyticsService = new AnalyticsService(
      repositories.analytics,
      repositories.members,
    );

    const analytics = await analyticsService.getCurrentMonthAnalytics(context);

    // 7. Assert: period end = workspace-local today (Sep 15), NOT UTC today (Sep 16)
    expect(analytics.period.startDate).toEqual(date("2026-09-01"));
    expect(analytics.period.endDate).toEqual(date("2026-09-15")); // workspace-local today

    // 8. Assert: only the Sep 15 entry is counted (Sep 16 is excluded by period end)
    expect(analytics.totalMinutes).toBe(240);
    // The 120-minute Sep 16 entry must NOT appear in the current-period totals
  });

  it("UTC-timezone workspace: period end follows UTC, not server local if they were to differ", async () => {
    // Sanity check: UTC workspace sees UTC today (Sep 16 at 01:00 UTC)
    const workspace = await repositories.workspaces.createWorkspace({
      name: "UTC Timezone Workspace",
      timezone: "UTC",
      currency: "EUR",
    });

    const userId = "tz-test-user-utc";

    await repositories.members.addMember({
      workspaceId: workspace.id,
      userId,
      role: "OWNER",
    });

    const resolution = await resolveWorkspaceContext(
      userId,
      repositories.members,
      repositories.workspaces,
    );

    expect(resolution.status).toBe("resolved");
    if (resolution.status !== "resolved") return;

    expect(resolution.context.timezone).toBe("UTC");

    const analyticsService = new AnalyticsService(
      repositories.analytics,
      repositories.members,
    );

    const analytics = await analyticsService.getCurrentMonthAnalytics(resolution.context);

    // UTC workspace: period end = UTC today = Sep 16
    expect(analytics.period.startDate).toEqual(date("2026-09-01"));
    expect(analytics.period.endDate).toEqual(date("2026-09-16"));
  });
});
