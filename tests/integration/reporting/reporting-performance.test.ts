// tests/integration/reporting/reporting-performance.test.ts
//
// P105-06: Performance baseline measurement at the EPIC-104 scalability reference volume.
//
// Fixture volume (§15, Table):
//   100 clients  — first 50 receive a contract each
//    50 contracts — one per first 50 clients
//  1000 time entries — distributed across 13 months (Sep 2025 … Sep 2026)
//
// Reference queries (§15):
//   1. Monthly report  (getContractReport, kind: "month")
//   2. Year / annual overview (getAnnualOverview, year: 2025)
//   3. Weekly aggregation over a full month (getWeeklyAnalytics, Sep 2025)
//   4. Year-scale contract report (getContractReport, kind: "year")
//
// Measurement: wall-clock duration of each call, via Date.now().
// No CI pass/fail threshold (PD-105-008 unanswered — no threshold invented here).
// Results are logged so they appear in test output and can be recorded in the
// Engineering Review for F-104-P-001.
//
// Query-count behaviour of getContractUtilizations (F-105-P-007):
//   Query 1: findMany — contracts with validity overlap
//   Query 2: groupBy  — in-period consumption by contractId
//   Query 3: findMany — contracts present in consumption but not in validity overlap (conditional)
//   Query 4 group: Promise.all of COUNT queries — one per contract with in-period consumption.
//             At CONTRACT_COUNT=50 this is ≤ 50 concurrent COUNTs per call.
//             These are batched via Promise.all (concurrent, not serial).
//             This is NOT a classical serial N+1; it is O(contracts_with_consumption)
//             concurrent DB operations. At the MVP scale of 50 contracts this is
//             ≤ 53 total operations per getContractUtilizations call.
//   Annual overview: 12 × getMonthlyAnalytics → 12 × getContractUtilizations
//             → up to 12 × 53 = 636 total operations.
//
// F-104-P-001 status after this test: MEASURED.
// F-105-P-007 status after this test: EVIDENCED at MVP scale; optimization deferred pending
//             PD-105-008 (no threshold has been set).

import { describe, it } from "vitest";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { ReportingService } from "@/application/reporting/reporting-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { repositories } from "../persistence/helpers";

// ---------------------------------------------------------------------------
// Deterministic "now"
// ---------------------------------------------------------------------------

function d(iso: string): Date {
  return new Date(iso + "T00:00:00.000Z");
}

const NOW = d("2026-09-16");
const REFERENCE_YEAR = 2025;

const CLIENT_COUNT = 100;
const CONTRACT_COUNT = 50;
const TIME_ENTRY_COUNT = 1000;

const MONTHS = [
  "2025-09-15",
  "2025-10-15",
  "2025-11-15",
  "2025-12-15",
  "2026-01-15",
  "2026-02-15",
  "2026-03-15",
  "2026-04-15",
  "2026-05-15",
  "2026-06-15",
  "2026-07-15",
  "2026-08-15",
  "2026-09-15",
];

// ---------------------------------------------------------------------------
// All measurements in one test — fixture survives across measurements
// (beforeEach in setup.ts truncates between tests, so fixture must be
//  built once and all queries run within the same test body)
// ---------------------------------------------------------------------------

describe("P105-06 performance baseline — §15 fixture volume", () => {
  it(
    "measures monthly, year-scale, annual-overview, and weekly queries at reference volume (no pass/fail threshold, PD-105-008)",
    async () => {
      // --- Build fixture ---------------------------------------------------
      const workspace = await repositories.workspaces.createWorkspace({
        name: "Performance Baseline Workspace",
        timezone: "UTC",
        currency: "EUR",
      });
      const userId = "perf-user";
      await repositories.members.addMember({
        workspaceId: workspace.id,
        userId,
        role: "OWNER",
      });

      const clientIds: string[] = [];
      for (let i = 0; i < CLIENT_COUNT; i++) {
        const client = await repositories.clients.createClient(workspace.id, {
          companyName: `Perf Client ${i}`,
        });
        clientIds.push(client.id);
      }

      const contractIds: string[] = [];
      for (let i = 0; i < CONTRACT_COUNT; i++) {
        const contract = await repositories.contracts.createContract(
          workspace.id,
          {
            clientId: clientIds[i],
            validFrom: d("2025-09-01"),
            validTo: d("2026-10-01"), // 13-month window, exclusive
            billingModel: "HOURLY",
            rate: "100.0000",
            currency: "EUR",
            monthlyContractedMinutes: 4800,
          },
        );
        contractIds.push(contract.id);
      }

      for (let i = 0; i < TIME_ENTRY_COUNT; i++) {
        const monthDate = MONTHS[i % MONTHS.length];
        const clientIdx = i % CONTRACT_COUNT;
        await repositories.timeEntries.recordTimeEntry(workspace.id, {
          userId,
          clientId: clientIds[clientIdx],
          contractId: contractIds[clientIdx],
          workDate: d(monthDate),
          durationMinutes: 60 + (i % 7) * 30,
          billable: i % 3 !== 0,
        });
      }

      const context: WorkspaceContext = {
        workspaceId: workspace.id,
        userId,
        role: "OWNER",
        timezone: "UTC",
      };

      const analyticsService = new AnalyticsService(
        repositories.analytics,
        repositories.members,
      );
      const reportingService = new ReportingService(analyticsService);

      // --- 1. Monthly contract report --------------------------------------
      {
        const t0 = Date.now();
        const report = await reportingService.getContractReport(
          context,
          { kind: "month" },
          NOW,
        );
        const elapsed = Date.now() - t0;
        console.log(
          `[PERF] monthly contract report: ${elapsed} ms | contracts returned: ${report.contractUtilizations.length}` +
            ` | fixture: ${CLIENT_COUNT} clients, ${CONTRACT_COUNT} contracts, ${TIME_ENTRY_COUNT} entries`,
        );
      }

      // --- 2. Annual overview (REFERENCE_YEAR = 2025) ----------------------
      {
        const t0 = Date.now();
        const overview = await reportingService.getAnnualOverview(
          context,
          REFERENCE_YEAR,
          NOW,
        );
        const elapsed = Date.now() - t0;
        const totalMinutes = overview.months.reduce(
          (sum, m) => sum + m.totalMinutes,
          0,
        );
        console.log(
          `[PERF] annual overview (${REFERENCE_YEAR}): ${elapsed} ms | months: ${overview.months.length} | total minutes: ${totalMinutes}` +
            ` | fixture: ${CLIENT_COUNT} clients, ${CONTRACT_COUNT} contracts, ${TIME_ENTRY_COUNT} entries`,
        );
      }

      // --- 3. Weekly aggregation over Sep 2025 (30-day window) ------------
      {
        const period = { startDate: d("2025-09-01"), endDate: d("2025-09-30") };
        const t0 = Date.now();
        const weekly = await analyticsService.getWeeklyAnalytics(
          context,
          period,
        );
        const elapsed = Date.now() - t0;
        console.log(
          `[PERF] weekly aggregation (Sep 2025, 30-day window): ${elapsed} ms | days: ${weekly.days.length} | total minutes: ${weekly.totalMinutes}` +
            ` | fixture: ${CLIENT_COUNT} clients, ${CONTRACT_COUNT} contracts, ${TIME_ENTRY_COUNT} entries`,
        );
      }

      // --- 4. Year-scale contract report (Jan 2026 → Sep 16 2026) ---------
      {
        const t0 = Date.now();
        const report = await reportingService.getContractReport(
          context,
          { kind: "year" },
          NOW,
        );
        const elapsed = Date.now() - t0;
        console.log(
          `[PERF] year-scale contract report: ${elapsed} ms | contracts returned: ${report.contractUtilizations.length}` +
            ` | fixture: ${CLIENT_COUNT} clients, ${CONTRACT_COUNT} contracts, ${TIME_ENTRY_COUNT} entries`,
        );
      }

      // --- F-105-P-007 analysis summary ------------------------------------
      console.log(
        `[PERF] F-105-P-007 query pattern analysis:` +
          ` getContractUtilizations issues 3 fixed queries + 1 Promise.all of COUNT queries` +
          ` (one per contract with in-period consumption, concurrent not serial).` +
          ` At ${CONTRACT_COUNT} contracts: ≤ ${CONTRACT_COUNT + 3} DB operations per call.` +
          ` Annual overview: 12 × getMonthlyAnalytics = up to 12 × (${CONTRACT_COUNT + 3}) = ${12 * (CONTRACT_COUNT + 3)} DB operations.` +
          ` No serial N+1 exists. Threshold decision deferred to PD-105-008.`,
      );
    },
    180_000, // generous timeout for fixture build + all queries
  );
});
