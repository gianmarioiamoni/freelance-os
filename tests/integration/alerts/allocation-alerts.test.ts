// tests/integration/alerts/allocation-alerts.test.ts
import { describe, expect, it } from "vitest";

import { evaluateContractAllocationAlerts } from "@/application/alerts/evaluate-allocation-alerts";
import { triggerAllocationAlertEvaluation } from "@/application/alerts/trigger-allocation-alert-evaluation";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { updateContract } from "@/application/contracts/update-contract";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { deleteTimeEntry } from "@/application/time-entries/delete-time-entry";
import { updateTimeEntry } from "@/application/time-entries/update-time-entry";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import { triggerAlertEvaluation } from "@/features/time-entries/trigger-alert-evaluation";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

import { prisma, repositories, runInTransaction } from "../persistence/helpers";

/**
 * Allocation alerts use lifetime allocatedMinutes (derived from commitment),
 * not monthly quota. TOTAL_HOURS yields allocatedMinutes = round(hours * 60).
 */
const fields = {
  validFrom: "2026-01-01",
  validTo: "2026-12-31",
  billingModel: "HOURLY" as const,
  rate: "80",
  currency: "EUR",
};

async function workspace(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `alloc-alert-${suffix}`,
    { name: `Alloc Alert ${suffix}`, timezone: "Europe/Rome", currency: "EUR" },
    { runInTransaction },
  );
  return created.context;
}

/** Seed a finite contract whose lifetime budget is exactly `allocatedMinutes`. */
async function seed(context: WorkspaceContext, allocatedMinutes: number) {
  const client = await createClient(context, { companyName: "Alloc" }, repositories.clients);
  const contract = await createContract(
    context,
    {
      ...fields,
      clientId: client.id,
      commitmentMode: "TOTAL_HOURS",
      commitmentValue: String(allocatedMinutes / 60),
    },
    repositories.clients,
    repositories.contracts,
  );
  expect(contract.allocatedMinutes).toBe(allocatedMinutes);
  return { client, contract };
}

function contractWrite(
  allocatedMinutes: number,
  overrides: Partial<typeof fields> = {},
) {
  return {
    ...fields,
    ...overrides,
    commitmentMode: "TOTAL_HOURS" as const,
    commitmentValue: String(allocatedMinutes / 60),
  };
}

function analytics() {
  return new AnalyticsService(repositories.analytics, repositories.members);
}

async function evaluate(context: WorkspaceContext, contractId: string) {
  return evaluateContractAllocationAlerts(
    context,
    contractId,
    {
      alerts: repositories.alerts,
      notifications: repositories.notifications,
      members: repositories.members,
    },
    analytics(),
  );
}

async function addEntry(
  context: WorkspaceContext,
  clientId: string,
  contractId: string,
  minutes: number,
) {
  return createTimeEntry(
    context,
    {
      clientId,
      contractId,
      workDate: new Date("2026-06-10T00:00:00.000Z"),
      durationMinutes: minutes,
      billable: true,
    },
    repositories.clients,
    repositories.contracts,
    repositories.timeEntries,
  );
}

async function activeAllocationAlerts(workspaceId: string, contractId: string) {
  return prisma.alert.findMany({
    where: {
      workspaceId,
      contractId,
      type: { in: ["ALLOCATION_WARNING", "ALLOCATION_EXCEEDED"] },
      resolvedAt: null,
    },
    orderBy: { type: "asc" },
  });
}

describe("allocation alert persistence and lifecycle", () => {
  it("persists a contract-level WARNING with notification and exclusive EXCEEDED", async () => {
    const context = await workspace("lifecycle");
    const { client, contract } = await seed(context, 1000);

    await addEntry(context, client.id, contract.id, 800);
    const warning = await evaluate(context, contract.id);
    expect(warning.warning.action).toBe("created");

    const afterWarning = await activeAllocationAlerts(context.workspaceId, contract.id);
    expect(afterWarning).toHaveLength(1);
    expect(afterWarning[0]?.type).toBe("ALLOCATION_WARNING");
    expect(afterWarning[0]?.severity).toBe("WARNING");
    expect(afterWarning[0]?.invoiceId).toBeNull();
    expect(afterWarning[0]?.periodStart).toBeNull();
    expect(afterWarning[0]?.deduplicationKey).toBe(
      `aw:${context.workspaceId}:${contract.id}`,
    );

    const notifications = await prisma.notification.findMany({
      where: { workspaceId: context.workspaceId, alertId: afterWarning[0]?.id },
    });
    expect(notifications).toHaveLength(1);

    await addEntry(context, client.id, contract.id, 250);
    const exceeded = await evaluate(context, contract.id);
    expect(exceeded.warning.action).toBe("resolved");
    expect(exceeded.exceeded.action).toBe("created");
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toEqual([
      expect.objectContaining({ type: "ALLOCATION_EXCEEDED", severity: "ERROR" }),
    ]);
  });

  it("resolves on NORMAL, retriggers after the condition returns, and isolates workspaces", async () => {
    const context = await workspace("retrigger");
    const other = await workspace("iso-b");
    const seeded = await seed(context, 1000);
    await seed(other, 1000);

    const entry = await addEntry(context, seeded.client.id, seeded.contract.id, 800);
    await evaluate(context, seeded.contract.id);
    expect(await activeAllocationAlerts(other.workspaceId, seeded.contract.id)).toEqual([]);

    await updateTimeEntry(
      context,
      entry.id,
      { durationMinutes: 100 },
      repositories.timeEntries,
    );
    const resolved = await evaluate(context, seeded.contract.id);
    expect(resolved.warning.action).toBe("resolved");
    expect(await activeAllocationAlerts(context.workspaceId, seeded.contract.id)).toEqual([]);

    await updateTimeEntry(
      context,
      entry.id,
      { durationMinutes: 850 },
      repositories.timeEntries,
    );
    const retriggered = await evaluate(context, seeded.contract.id);
    expect(retriggered.warning.action).toBe("created");
    const rows = await activeAllocationAlerts(context.workspaceId, seeded.contract.id);
    expect(rows[0]?.deduplicationKey).toMatch(
      new RegExp(`^aw:${context.workspaceId}:${seeded.contract.id}:\\d+$`),
    );
  });

  it("TimeEntry create/update/delete trigger allocation evaluation for that Contract", async () => {
    const context = await workspace("time");
    const { client, contract } = await seed(context, 100);
    const repos = {
      alerts: repositories.alerts,
      notifications: repositories.notifications,
      members: repositories.members,
      settings: repositories.settings,
      analytics: repositories.analytics,
    };

    const entry = await addEntry(context, client.id, contract.id, 80);
    await triggerAlertEvaluation(context, repos, contract.id);
    expect((await activeAllocationAlerts(context.workspaceId, contract.id))[0]?.type).toBe(
      "ALLOCATION_WARNING",
    );

    await updateTimeEntry(context, entry.id, { durationMinutes: 120 }, repositories.timeEntries);
    await triggerAlertEvaluation(context, repos, contract.id);
    expect((await activeAllocationAlerts(context.workspaceId, contract.id))[0]?.type).toBe(
      "ALLOCATION_EXCEEDED",
    );

    await deleteTimeEntry(context, entry.id, repositories.timeEntries);
    await triggerAlertEvaluation(context, repos, contract.id);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toEqual([]);
  });

  it("commitment/date writes recompute; zero commitment and ongoing resolve alerts", async () => {
    const context = await workspace("writes");
    const { client, contract } = await seed(context, 1000);
    await addEntry(context, client.id, contract.id, 800);
    await evaluate(context, contract.id);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toHaveLength(1);

    // Shrink lifetime budget via TOTAL_HOURS → EXCEEDED
    await updateContract(
      context,
      contract.id,
      contractWrite(700),
      runInTransaction,
    );
    await triggerAllocationAlertEvaluation(context, contract.id, runInTransaction);
    expect((await activeAllocationAlerts(context.workspaceId, contract.id))[0]?.type).toBe(
      "ALLOCATION_EXCEEDED",
    );

    // Move validity so June entry is outside [validFrom, validTo) → consumption 0
    await updateContract(
      context,
      contract.id,
      contractWrite(700, { validFrom: "2026-07-01", validTo: "2026-12-31" }),
      runInTransaction,
    );
    await triggerAllocationAlertEvaluation(context, contract.id, runInTransaction);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toEqual([]);

    // Restore validity window + budget; add more work → alert again
    await updateContract(
      context,
      contract.id,
      contractWrite(700),
      runInTransaction,
    );
    await addEntry(context, client.id, contract.id, 80);
    await evaluate(context, contract.id);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toHaveLength(1);

    // Zero commitment → allocatedMinutes 0 → no allocation status → resolve
    await updateContract(
      context,
      contract.id,
      {
        ...fields,
        commitmentMode: "PERCENTAGE",
        commitmentValue: "0",
      },
      runInTransaction,
    );
    await triggerAllocationAlertEvaluation(context, contract.id, runInTransaction);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toEqual([]);

    // Restore finite budget, then convert to ongoing → allocatedMinutes null → resolve
    await updateContract(
      context,
      contract.id,
      contractWrite(700),
      runInTransaction,
    );
    await evaluate(context, contract.id);
    await updateContract(
      context,
      contract.id,
      {
        ...fields,
        validTo: null,
        commitmentMode: "PERCENTAGE",
        commitmentValue: "60",
      },
      runInTransaction,
    );
    await triggerAllocationAlertEvaluation(context, contract.id, runInTransaction);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toEqual([]);
  });

  it("threshold matrix: <80% none, 80% WARNING, 100% WARNING, >100% EXCEEDED, 0% none", async () => {
    const context = await workspace("thresholds");
    const budget = 1000;
    const { client, contract } = await seed(context, budget);

    // <80%
    const entry = await addEntry(context, client.id, contract.id, 799);
    expect((await evaluate(context, contract.id)).warning.action).toBe("none");
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toEqual([]);

    // exactly 80%
    await updateTimeEntry(context, entry.id, { durationMinutes: 800 }, repositories.timeEntries);
    expect((await evaluate(context, contract.id)).warning.action).toBe("created");
    expect((await activeAllocationAlerts(context.workspaceId, contract.id))[0]?.type).toBe(
      "ALLOCATION_WARNING",
    );

    // exactly 100% — still WARNING (EXCEEDED is strictly >100%)
    await updateTimeEntry(context, entry.id, { durationMinutes: 1000 }, repositories.timeEntries);
    const atCap = await evaluate(context, contract.id);
    expect(["none", "deduplicated"]).toContain(atCap.warning.action);
    expect(atCap.exceeded.action).toBe("none");
    expect((await activeAllocationAlerts(context.workspaceId, contract.id))[0]?.type).toBe(
      "ALLOCATION_WARNING",
    );

    // >100%
    await updateTimeEntry(context, entry.id, { durationMinutes: 1001 }, repositories.timeEntries);
    const over = await evaluate(context, contract.id);
    expect(over.warning.action).toBe("resolved");
    expect(over.exceeded.action).toBe("created");

    // 0% commitment → no status
    await updateContract(
      context,
      contract.id,
      { ...fields, commitmentMode: "PERCENTAGE", commitmentValue: "0" },
      runInTransaction,
    );
    await triggerAllocationAlertEvaluation(context, contract.id, runInTransaction);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toEqual([]);
  });

  it("PERCENTAGE 60% uses lifetime allocatedMinutes from working days, not monthly quota", async () => {
    // Mon–Fri week: 2026-09-21 → 2026-09-26 = 5 WD × 8h × 60% = 24h = 1440 min
    const context = await workspace("pct60");
    const client = await createClient(context, { companyName: "Pct60" }, repositories.clients);
    const contract = await createContract(
      context,
      {
        clientId: client.id,
        validFrom: "2026-09-21",
        validTo: "2026-09-26",
        billingModel: "HOURLY",
        rate: "80",
        currency: "EUR",
        commitmentMode: "PERCENTAGE",
        commitmentValue: "60",
      },
      repositories.clients,
      repositories.contracts,
    );

    expect(contract.commitmentPercentage).toBe(60);
    expect(contract.allocatedMinutes).toBe(1440);

    // 80% of lifetime = 1152. Sept monthly quota at 60% ≈ 6336 → would NOT warn.
    // Lifetime path → WARNING.
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: new Date("2026-09-22T00:00:00.000Z"),
        durationMinutes: 1152,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    expect((await evaluate(context, contract.id)).warning.action).toBe("created");
    expect((await activeAllocationAlerts(context.workspaceId, contract.id))[0]?.type).toBe(
      "ALLOCATION_WARNING",
    );
  });
});
