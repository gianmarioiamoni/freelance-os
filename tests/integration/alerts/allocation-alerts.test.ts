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

async function seed(context: WorkspaceContext, allocatedMinutes: string | number) {
  const client = await createClient(context, { companyName: "Alloc" }, repositories.clients);
  const contract = await createContract(
    context,
    { ...fields, clientId: client.id, allocatedMinutes },
    repositories.clients,
    repositories.contracts,
  );
  return { client, contract };
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

  it("allocation and validity writes recompute and zero/null allocation resolve alerts", async () => {
    const context = await workspace("writes");
    const { client, contract } = await seed(context, 1000);
    await addEntry(context, client.id, contract.id, 800);
    await evaluate(context, contract.id);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toHaveLength(1);

    await updateContract(
      context,
      contract.id,
      { ...fields, allocatedMinutes: 700 },
      runInTransaction,
    );
    await triggerAllocationAlertEvaluation(context, contract.id, runInTransaction);
    expect((await activeAllocationAlerts(context.workspaceId, contract.id))[0]?.type).toBe(
      "ALLOCATION_EXCEEDED",
    );

    await updateContract(
      context,
      contract.id,
      { ...fields, validFrom: "2026-07-01", validTo: "2026-12-31", allocatedMinutes: 700 },
      runInTransaction,
    );
    await triggerAllocationAlertEvaluation(context, contract.id, runInTransaction);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toEqual([]);

    await updateContract(
      context,
      contract.id,
      { ...fields, allocatedMinutes: 700 },
      runInTransaction,
    );
    await addEntry(context, client.id, contract.id, 80);
    await evaluate(context, contract.id);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toHaveLength(1);

    await updateContract(context, contract.id, { ...fields, allocatedMinutes: 0 }, runInTransaction);
    await triggerAllocationAlertEvaluation(context, contract.id, runInTransaction);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toEqual([]);

    await updateContract(
      context,
      contract.id,
      { ...fields, allocatedMinutes: 700 },
      runInTransaction,
    );
    await evaluate(context, contract.id);
    await updateContract(
      context,
      contract.id,
      { ...fields, allocatedMinutes: null },
      runInTransaction,
    );
    await triggerAllocationAlertEvaluation(context, contract.id, runInTransaction);
    expect(await activeAllocationAlerts(context.workspaceId, contract.id)).toEqual([]);
  });
});
