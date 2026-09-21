// tests/integration/reporting/reporting-service.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import {
  ReportingService,
  ReportingError,
} from "@/application/reporting/reporting-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { repositories } from "../persistence/helpers";
import { createWorkspaceGraph } from "../persistence/fixtures";
import type { AnalyticsPeriod } from "@/domain/analytics-types";

/**
 * Integration tests for ReportingService (P105-04).
 *
 * Covers:
 * - Period-kind resolution (today / week / month / year / custom)
 * - Invalid period rejection (BR-105-010)
 * - Workspace isolation (SI-105-001 … SI-105-006)
 * - Workspace membership guard
 * - All four ongoing/unlimited combinations (BR-105-016)
 * - Pro-rata capacity (BR-105-017): full overlap, partial overlap, no overlap
 * - Relevance-driven contract list (BR-105-018): zero-consumption, out-of-validity
 * - Total reconciliation: report total equals time-tracking total for the same period
 * - OBD-012: no rollover semantics asserted
 */

function d(iso: string): Date {
  return new Date(iso + "T00:00:00.000Z");
}

// Deterministic "now" used in all tests to avoid clock-dependent results.
const NOW = d("2026-09-16");
// Period derived from NOW with timezone "UTC":
//   today  = 2026-09-16
//   week   = 2026-09-14 → 2026-09-16 (Mon–Wed)
//   month  = 2026-09-01 → 2026-09-16
//   year   = 2026-01-01 → 2026-09-16

describe("ReportingService integration", () => {
  let analyticsService: AnalyticsService;
  let reportingService: ReportingService;
  let context: Awaited<ReturnType<typeof createWorkspaceGraph>>;

  beforeEach(async () => {
    context = await createWorkspaceGraph(repositories, "reporting");
    analyticsService = new AnalyticsService(repositories.analytics, repositories.members);
    reportingService = new ReportingService(analyticsService);
  });

  // --------------------------------------------------------------------------
  // Period resolution
  // --------------------------------------------------------------------------

  describe("resolvePeriod", () => {
    const timezone = "UTC";

    it("resolves 'today' to a single day", () => {
      const period = reportingService.resolvePeriod({ kind: "today" }, timezone, NOW);
      expect(period.startDate).toEqual(d("2026-09-16"));
      expect(period.endDate).toEqual(d("2026-09-16"));
    });

    it("resolves 'week' to Monday–today", () => {
      const period = reportingService.resolvePeriod({ kind: "week" }, timezone, NOW);
      expect(period.startDate).toEqual(d("2026-09-14")); // Monday
      expect(period.endDate).toEqual(d("2026-09-16"));   // Wednesday (NOW)
    });

    it("resolves 'month' to first-of-month through today", () => {
      const period = reportingService.resolvePeriod({ kind: "month" }, timezone, NOW);
      expect(period.startDate).toEqual(d("2026-09-01"));
      expect(period.endDate).toEqual(d("2026-09-16"));
    });

    it("resolves 'year' to Jan 1 through today", () => {
      const period = reportingService.resolvePeriod({ kind: "year" }, timezone, NOW);
      expect(period.startDate).toEqual(d("2026-01-01"));
      expect(period.endDate).toEqual(d("2026-09-16"));
    });

    it("resolves 'custom' range correctly", () => {
      const period = reportingService.resolvePeriod(
        { kind: "custom", startDate: d("2026-06-01"), endDate: d("2026-06-30") },
        timezone,
        NOW,
      );
      expect(period.startDate).toEqual(d("2026-06-01"));
      expect(period.endDate).toEqual(d("2026-06-30"));
    });

    it("rejects reversed custom range (BR-105-010 fail-closed)", () => {
      expect(() =>
        reportingService.resolvePeriod(
          { kind: "custom", startDate: d("2026-09-30"), endDate: d("2026-09-01") },
          timezone,
          NOW,
        )
      ).toThrow(ReportingError);
    });
  });

  // --------------------------------------------------------------------------
  // Workspace membership guard
  // --------------------------------------------------------------------------

  it("rejects callers who are not workspace members", async () => {
    const nonMemberContext: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: "non-member-user",
      role: "OWNER",
      timezone: "UTC",
    };

    await expect(
      reportingService.getContractReport(nonMemberContext, { kind: "month" }, NOW),
    ).rejects.toThrow();
  });

  // --------------------------------------------------------------------------
  // Workspace isolation (SI-105-001 / SI-105-003)
  // --------------------------------------------------------------------------

  it("isolates contract data across workspaces", async () => {
    const otherGraph = await createWorkspaceGraph(repositories, "isolation-other");

    // Add a contract and time to the OTHER workspace within the period.
    // The default fixture contract has validTo: 2026-07-01, so we create a new client
    // to avoid the overlap exclusion constraint.
    const otherClient = await repositories.clients.createClient(otherGraph.workspaceId, {
      companyName: "Other Isolation Client",
    });
    const otherContract = await repositories.contracts.createContract(otherGraph.workspaceId, {
      clientId: otherClient.id,
      validFrom: d("2026-09-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });
    await repositories.timeEntries.recordTimeEntry(otherGraph.workspaceId, {
      userId: otherGraph.userId,
      clientId: otherClient.id,
      contractId: otherContract.id,
      workDate: d("2026-09-10"),
      durationMinutes: 480,
      billable: true,
    });

    // Query OUR workspace — must not see the other workspace's data.
    const ourContext: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };
    const report = await reportingService.getContractReport(ourContext, { kind: "month" }, NOW);

    const otherContractInReport = report.contractUtilizations.find(
      u => u.contractId === otherContract.id,
    );
    expect(otherContractInReport).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Case 1 — Finite validity + finite capacity (full overlap)
  // --------------------------------------------------------------------------

  it("finite validity + finite capacity: correct pro-rata and utilization", async () => {
    // Each test creates its own client to avoid the contract-overlap exclusion constraint.
    // Period: Sep 1–16 (16 days). Contract: Jan 1 → Dec 31 inclusive (validTo = Jan 1 2027).
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    const client = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Client FF",
    });
    const contract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client.id,
      validFrom: d("2026-01-01"),
      validTo: d("2027-01-01"), // exclusive → through Dec 31 inclusive
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800, // 80h/month
    });

    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: d("2026-09-10"),
      durationMinutes: 960, // 16h
      billable: true,
    });

    const report = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);
    const util = report.contractUtilizations.find(u => u.contractId === contract.id);

    expect(util).toBeDefined();
    expect(util!.isOngoing).toBe(false); // finite validTo
    expect(util!.consumedMinutes).toBe(960);

    // Pro-rata: 4800 × 16/16 = 4800 (contract covers all 16 days of period)
    // Period: 2026-09-01 → 2026-09-16 = 16 days. Contract covers all → overlap 16.
    expect(util!.contractedMinutes).toBeCloseTo(4800 * 16 / 16, 4); // 4800
    expect(util!.utilizationPercentage).toBeCloseTo((960 / 4800) * 100, 2); // 20%
    expect(util!.isOutOfValidity).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Case 2 — Finite validity + null capacity
  // --------------------------------------------------------------------------

  it("finite validity + null capacity: contractedMinutes null, percentage null", async () => {
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    const client = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Client FN",
    });
    const contract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client.id,
      validFrom: d("2026-01-01"),
      validTo: d("2027-01-01"),
      billingModel: "DAILY",
      rate: "800.0000",
      currency: "EUR",
      monthlyContractedMinutes: null, // unlimited — no capacity denominator
    });

    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: d("2026-09-10"),
      durationMinutes: 480,
      billable: true,
    });

    const report = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);
    const util = report.contractUtilizations.find(u => u.contractId === contract.id);

    expect(util).toBeDefined();
    expect(util!.isOngoing).toBe(false); // finite validTo
    expect(util!.consumedMinutes).toBe(480);
    expect(util!.contractedMinutes).toBeNull(); // no denominator invented
    expect(util!.utilizationPercentage).toBeNull(); // null — not zero
    expect(util!.isOutOfValidity).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Case 3 — Ongoing validity + finite capacity (BR-105-016: ongoing ≠ unlimited)
  // --------------------------------------------------------------------------

  it("ongoing validity + finite capacity: isOngoing true, capacity pro-rated", async () => {
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    const client = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Client OF",
    });
    const contract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client.id,
      validFrom: d("2026-01-01"),
      validTo: null, // ongoing
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800, // finite capacity — ongoing does NOT mean unlimited
    });

    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: d("2026-09-10"),
      durationMinutes: 480,
      billable: true,
    });

    const report = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);
    const util = report.contractUtilizations.find(u => u.contractId === contract.id);

    expect(util).toBeDefined();
    // BR-105-016: ongoing ≡ validTo === null.
    expect(util!.isOngoing).toBe(true);
    // BR-105-017: finite capacity — ongoing does not imply unlimited.
    expect(util!.contractedMinutes).not.toBeNull();
    expect(util!.contractedMinutes).toBeGreaterThan(0);
    // Utilization is computable.
    expect(util!.utilizationPercentage).not.toBeNull();
    expect(util!.isOutOfValidity).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Case 4 — Ongoing validity + null capacity
  // --------------------------------------------------------------------------

  it("ongoing validity + null capacity: isOngoing true, percentage null", async () => {
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    const client = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Client ON",
    });
    const contract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client.id,
      validFrom: d("2026-01-01"),
      validTo: null, // ongoing
      billingModel: "DAILY",
      rate: "800.0000",
      currency: "EUR",
      monthlyContractedMinutes: null, // unlimited
    });

    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: d("2026-09-10"),
      durationMinutes: 480,
      billable: true,
    });

    const report = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);
    const util = report.contractUtilizations.find(u => u.contractId === contract.id);

    expect(util).toBeDefined();
    expect(util!.isOngoing).toBe(true);
    expect(util!.contractedMinutes).toBeNull();
    expect(util!.utilizationPercentage).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Case 5 — Partial overlap (start-side and end-side)
  // --------------------------------------------------------------------------

  it("partial overlap: contract starts after period start (start-side)", async () => {
    // Period: Sep 1–16 (16 days). Contract starts Sep 9 → ongoing.
    // Overlap: Sep 9–16 = 8 days. Pro-rata = 4800 × 8/16 = 2400.
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    const client = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Client PS",
    });
    const contract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client.id,
      validFrom: d("2026-09-09"),
      validTo: null, // ongoing
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });

    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: d("2026-09-12"),
      durationMinutes: 480, // 8h in-period
      billable: true,
    });

    const report = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);
    const util = report.contractUtilizations.find(u => u.contractId === contract.id);

    expect(util).toBeDefined();
    expect(util!.consumedMinutes).toBe(480);
    // 4800 × 8/16 = 2400
    expect(util!.contractedMinutes).toBeCloseTo(2400, 4);
    expect(util!.utilizationPercentage).toBeCloseTo((480 / 2400) * 100, 2); // 20%
    expect(util!.isOutOfValidity).toBe(false);
  });

  it("partial overlap: contract ends before period end (end-side)", async () => {
    // Period: Sep 1–16 (16 days). Contract: Jan 1 → Sep 9 (exclusive) → last day Sep 8.
    // Overlap: Sep 1–8 = 8 days. Pro-rata = 4800 × 8/16 = 2400.
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    const client = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Client PE",
    });
    const contract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client.id,
      validFrom: d("2026-01-01"),
      validTo: d("2026-09-09"), // exclusive → last inclusive = Sep 8
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });

    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: d("2026-09-05"),
      durationMinutes: 480, // within validity
      billable: true,
    });

    const report = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);
    const util = report.contractUtilizations.find(u => u.contractId === contract.id);

    expect(util).toBeDefined();
    expect(util!.consumedMinutes).toBe(480);
    // 4800 × 8/16 = 2400
    expect(util!.contractedMinutes).toBeCloseTo(2400, 4);
    expect(util!.utilizationPercentage).toBeCloseTo((480 / 2400) * 100, 2); // 20%
    expect(util!.isOutOfValidity).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Case 6 — Zero tracked time (contract with no consumption) (BR-105-018)
  // --------------------------------------------------------------------------

  it("zero-consumption contract with validity overlap appears at 0h/capacity/0% (BR-105-018)", async () => {
    // Period: Sep 1–16. Contract covers the whole period. No time entries.
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    const client = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Client Zero",
    });
    const contract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client.id,
      validFrom: d("2026-01-01"),
      validTo: d("2027-01-01"),
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });
    // No time entries recorded.

    const report = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);
    const util = report.contractUtilizations.find(u => u.contractId === contract.id);

    expect(util).toBeDefined();
    expect(util!.consumedMinutes).toBe(0); // 0h
    expect(util!.contractedMinutes).not.toBeNull(); // capacity available
    expect(util!.contractedMinutes).toBeGreaterThan(0);
    expect(util!.utilizationPercentage).toBe(0); // 0%
    expect(util!.isOutOfValidity).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Case 7 — No overlap: period entirely outside contract validity (F-105-P-009)
  // --------------------------------------------------------------------------

  it("consumption outside validity: retained, flagged, percentage null (F-105-P-009)", async () => {
    // Contract: Jan 1 → Jul 1 2026 (exclusive). Period: Sep 1–16.
    // No validity overlap — contract found via consumption relevance only.
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    const client = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Client OOV",
    });
    const contract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client.id,
      validFrom: d("2026-01-01"),
      validTo: d("2026-07-01"), // ends Jun 30 inclusive
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });

    // Time recorded in Sep — outside validity. Retained and flagged (BR-105-018).
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: d("2026-09-10"),
      durationMinutes: 480,
      billable: true,
    });

    const report = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);
    const util = report.contractUtilizations.find(u => u.contractId === contract.id);

    // BR-105-018: row must not be dropped.
    expect(util).toBeDefined();
    // Consumption retained — not silently discarded.
    expect(util!.consumedMinutes).toBe(480);
    // Pro-rata: no overlap → 0 capacity denominator.
    expect(util!.contractedMinutes).toBe(0);
    // BR-104-011: zero denominator → null percentage.
    expect(util!.utilizationPercentage).toBeNull();
    // BR-105-018: flagged as out-of-validity.
    expect(util!.isOutOfValidity).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Total reconciliation (BR-105-018)
  // --------------------------------------------------------------------------

  it("report total equals time-tracking total for the same period (BR-105-018)", async () => {
    // Create two clients / contracts: one with valid-period overlap, one expired.
    // Each client has exactly one contract to avoid the overlap exclusion constraint.
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    const clientA = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Client Recon A",
    });
    const validContract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: clientA.id,
      validFrom: d("2026-01-01"),
      validTo: d("2027-01-01"),
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });

    const clientB = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Client Recon B",
    });
    const expiredContract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: clientB.id,
      validFrom: d("2026-01-01"),
      validTo: d("2026-07-01"), // expired before Sep
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 3000,
    });

    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: clientA.id,
      contractId: validContract.id,
      workDate: d("2026-09-10"),
      durationMinutes: 480,
      billable: true,
    });

    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: clientB.id,
      contractId: expiredContract.id,
      workDate: d("2026-09-11"),
      durationMinutes: 240, // out-of-validity: Sep is past Jul 1
      billable: true,
    });

    const report = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);

    // All contracts must appear in the report.
    const validUtil = report.contractUtilizations.find(u => u.contractId === validContract.id);
    const expiredUtil = report.contractUtilizations.find(u => u.contractId === expiredContract.id);

    expect(validUtil).toBeDefined();
    expect(expiredUtil).toBeDefined();

    // Report total = sum of all consumed minutes across all contracts.
    const reportTotal = report.contractUtilizations.reduce((sum, u) => sum + u.consumedMinutes, 0);

    // Time-tracking total for the same period (direct DB aggregation).
    const analyticsMonth = await analyticsService.getMonthlyAnalytics(workCtx, {
      startDate: d("2026-09-01"),
      endDate: d("2026-09-16"),
    });

    // The report total must reconcile with the time-tracking total.
    expect(reportTotal).toBe(analyticsMonth.totalMinutes);
    expect(reportTotal).toBe(720); // 480 + 240

    // Expired contract is flagged.
    expect(expiredUtil!.isOutOfValidity).toBe(true);
    expect(expiredUtil!.consumedMinutes).toBe(240);
  });

  // --------------------------------------------------------------------------
  // OBD-012: No rollover semantics
  // --------------------------------------------------------------------------

  it("OBD-012: no rollover — capacity is computed independently per period", async () => {
    // Run two separate period queries. The second period must not accumulate
    // unused capacity from the first period. Each period stands alone.
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    const client = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Client OBD",
    });
    const contract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client.id,
      validFrom: d("2026-01-01"),
      validTo: null, // ongoing
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });

    // Aug period (31 days): zero consumption.
    const augReport = await reportingService.getContractReport(
      workCtx,
      { kind: "custom", startDate: d("2026-08-01"), endDate: d("2026-08-31") },
      NOW,
    );
    // Sep period (16 days): 480 min consumed.
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: d("2026-09-10"),
      durationMinutes: 480,
      billable: true,
    });
    const sepReport = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);

    const augUtil = augReport.contractUtilizations.find(u => u.contractId === contract.id);
    const sepUtil = sepReport.contractUtilizations.find(u => u.contractId === contract.id);

    // Both periods show their own pro-rata. No carry-over from Aug to Sep.
    expect(augUtil).toBeDefined();
    expect(augUtil!.consumedMinutes).toBe(0);
    expect(augUtil!.contractedMinutes).toBe(4800); // 31/31 × 4800

    expect(sepUtil).toBeDefined();
    expect(sepUtil!.consumedMinutes).toBe(480);
    // Sep period = 16 days: 4800 × 16/16 = 4800 (contract covers all).
    expect(sepUtil!.contractedMinutes).toBeCloseTo(4800, 4);
    // Capacity is NOT aug's 4800 + sep's 4800 — no rollover.
  });

  // --------------------------------------------------------------------------
  // F-105-010: Archived-client integration test (BR-104-007 / PD-104-001)
  // --------------------------------------------------------------------------

  it("archived-client time is included and the client is accessible via the reporting path (PD-104-001)", async () => {
    // An archived client's time must be retained in the reporting layer, not filtered.
    // The underlying analytics rule (PD-104-001) is verified here at the ReportingService boundary.
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    // Create and archive a client.
    const archivedClient = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Archived Corp",
    });
    await repositories.clients.archiveClient(context.workspaceId, archivedClient.id);

    // Create a contract for the archived client valid over the period.
    const archivedContract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: archivedClient.id,
      validFrom: d("2026-01-01"),
      validTo: d("2027-01-01"),
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });

    // Record time for the archived client inside the period.
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: archivedClient.id,
      contractId: archivedContract.id,
      workDate: d("2026-09-10"),
      durationMinutes: 360, // 6 hours
      billable: true,
    });

    const report = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);

    // The archived client's contract must appear in the report (PD-104-001).
    const util = report.contractUtilizations.find(u => u.contractId === archivedContract.id);
    expect(util).toBeDefined();
    expect(util!.clientName).toBe("Archived Corp");
    expect(util!.consumedMinutes).toBe(360); // not dropped
    expect(util!.contractedMinutes).not.toBeNull();
    expect(util!.utilizationPercentage).not.toBeNull();

    // Hours-by-client must also include the archived client.
    const clientReport = await reportingService.getHoursByClient(workCtx, { kind: "month" }, NOW);
    const clientAllocation = clientReport.clientAllocations.find(
      a => a.clientName === "Archived Corp",
    );
    expect(clientAllocation).toBeDefined();
    expect(clientAllocation!.isArchived).toBe(true); // flagged as archived
    expect(clientAllocation!.totalMinutes).toBe(360);
  });

  // --------------------------------------------------------------------------
  // F-105-011: Zero-activity integration test
  // --------------------------------------------------------------------------

  it("zero-activity period: relevant contracts appear with 0h, capacity retained, 0% utilization", async () => {
    // A period with no tracked activity at all.
    // Contracts with validity overlap still appear (BR-105-018).
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    // Contract with finite capacity, valid over the period — no time entries.
    const clientFinite = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Zero Activity Finite",
    });
    const finiteContract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: clientFinite.id,
      validFrom: d("2026-01-01"),
      validTo: d("2027-01-01"),
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });

    // Contract with null capacity, valid over the period — no time entries.
    const clientNull = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Zero Activity Null",
    });
    const nullContract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: clientNull.id,
      validFrom: d("2026-01-01"),
      validTo: d("2027-01-01"),
      billingModel: "DAILY",
      rate: "800.0000",
      currency: "EUR",
      monthlyContractedMinutes: null, // unlimited
    });

    // No time entries recorded for either contract.

    const report = await reportingService.getContractReport(workCtx, { kind: "month" }, NOW);

    // Finite-capacity contract: 0h consumed, capacity available, 0% utilization.
    const finiteUtil = report.contractUtilizations.find(u => u.contractId === finiteContract.id);
    expect(finiteUtil).toBeDefined();
    expect(finiteUtil!.consumedMinutes).toBe(0); // zero tracked time
    expect(finiteUtil!.contractedMinutes).not.toBeNull(); // capacity retained
    expect(finiteUtil!.contractedMinutes).toBeGreaterThan(0);
    expect(finiteUtil!.utilizationPercentage).toBe(0); // 0/capacity = 0%
    expect(finiteUtil!.isOutOfValidity).toBe(false);

    // Null-capacity contract: 0h consumed, null capacity, null utilization.
    const nullUtil = report.contractUtilizations.find(u => u.contractId === nullContract.id);
    expect(nullUtil).toBeDefined();
    expect(nullUtil!.consumedMinutes).toBe(0);
    expect(nullUtil!.contractedMinutes).toBeNull(); // no denominator
    expect(nullUtil!.utilizationPercentage).toBeNull(); // null — not 0%
  });

  // --------------------------------------------------------------------------
  // F-105-012: Dashboard-agreement assertion
  // P105-04 plan §12, F-105-P-006: dedicated dashboard-agreement integration test.
  // Proves that AnalyticsService (dashboard path) and ReportingService (reporting path)
  // yield the same underlying business figures for the same period and workspace data.
  // --------------------------------------------------------------------------

  it("dashboard-agreement: ReportingService figures match AnalyticsService for the same period (F-105-P-006)", async () => {
    // Shared deterministic period: Sep 1–16 (matches NOW-derived month period).
    const period: AnalyticsPeriod = {
      startDate: d("2026-09-01"),
      endDate: d("2026-09-16"),
    };
    const workCtx: WorkspaceContext = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    // Seed: one contract with finite capacity, one time entry.
    const client = await repositories.clients.createClient(context.workspaceId, {
      companyName: "Agreement Client",
    });
    const contract = await repositories.contracts.createContract(context.workspaceId, {
      clientId: client.id,
      validFrom: d("2026-01-01"),
      validTo: d("2027-01-01"),
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: d("2026-09-10"),
      durationMinutes: 480, // 8 hours
      billable: true,
    });

    // Dashboard path: AnalyticsService.getMonthlyAnalytics (called by the dashboard route).
    const dashboardAnalytics = await analyticsService.getMonthlyAnalytics(workCtx, period);

    // Reporting path: ReportingService.getContractReport (called by the reporting route).
    const contractReport = await reportingService.getContractReport(
      workCtx,
      { kind: "custom", startDate: period.startDate, endDate: period.endDate },
      NOW,
    );

    // The two paths must agree on total tracked minutes for the period.
    const reportTotal = contractReport.contractUtilizations.reduce(
      (sum, u) => sum + u.consumedMinutes, 0,
    );
    expect(reportTotal).toBe(dashboardAnalytics.totalMinutes);

    // They must agree on the utilization figures for each contract.
    const dashboardUtil = dashboardAnalytics.contractUtilizations.find(
      u => u.contractId === contract.id,
    );
    const reportUtil = contractReport.contractUtilizations.find(
      u => u.contractId === contract.id,
    );

    expect(dashboardUtil).toBeDefined();
    expect(reportUtil).toBeDefined();

    // Same consumed minutes — both use ALL tracked time (PD-104-002).
    expect(reportUtil!.consumedMinutes).toBe(dashboardUtil!.consumedMinutes);

    // Same pro-rated capacity — both use the same AnalyticsService calculation (BR-105-017).
    expect(reportUtil!.contractedMinutes).toBe(dashboardUtil!.contractedMinutes);

    // Same utilization percentage — single shared calculation, no divergence (F-104-002).
    expect(reportUtil!.utilizationPercentage).toBe(dashboardUtil!.utilizationPercentage);

    // Exact values (480/4800 = 10%); verifying both sides agree and are correct.
    expect(reportUtil!.consumedMinutes).toBe(480);
    expect(reportUtil!.contractedMinutes).toBe(4800); // full 16/16 overlap
    expect(reportUtil!.utilizationPercentage).toBeCloseTo(10, 4); // 480/4800 × 100

    expect(contractReport.accrued).toEqual(dashboardAnalytics.accrued);
    expect(contractReport.expected).toEqual(dashboardAnalytics.expected);
    expect(dashboardAnalytics.accrued.byCurrency).toEqual([
      { currency: "EUR", unrounded: 800, published: 800 },
    ]);
    expect(dashboardAnalytics.expected.byCurrency).toEqual([
      { currency: "EUR", unrounded: 8000, published: 8000 },
    ]);
  });
});
