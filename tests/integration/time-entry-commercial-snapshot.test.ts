// tests/integration/time-entry-commercial-snapshot.test.ts
import { describe, expect, it } from "vitest";

import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { updateContract } from "@/application/contracts/update-contract";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { getTimeEntry } from "@/application/time-entries/get-time-entry";
import { updateTimeEntry } from "@/application/time-entries/update-time-entry";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotFoundError } from "@/domain/contract-errors";

import { date, prisma, repositories, runInTransaction } from "./persistence/helpers";

async function createWorkspaceContext(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `snap-${suffix}`,
    { name: `Snap ${suffix}`, timezone: "Europe/Rome", currency: "EUR" },
    { runInTransaction },
  );
  return created.context;
}

async function setupHourlyContract(
  context: WorkspaceContext,
  rate = "80",
  currency = "EUR",
) {
  const client = await createClient(
    context,
    {
      companyName: "Snapshot Client",
      email: "",
      phone: "",
      address: "",
      vatNumber: "",
      notes: "",
    },
    repositories.clients,
  );
  const contract = await createContract(
    context,
    {
      clientId: client.id,
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      billingModel: "HOURLY",
      rate,
      currency,
    },
    repositories.clients,
    repositories.contracts,
  );
  return { client, contract };
}

describe("TimeEntry commercial snapshot", () => {
  it("captures billing model, rate, and currency from the authorized Contract", async () => {
    const context = await createWorkspaceContext("create");
    const { client, contract } = await setupHourlyContract(context, "80.5", "EUR");

    const entry = await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 120,
        description: "Work",
        billable: true,
        snapshotRate: "999.0000",
        snapshotCurrency: "USD",
        snapshotBillingModel: "DAILY",
      } as Parameters<typeof createTimeEntry>[1] & {
        snapshotRate: string;
        snapshotCurrency: string;
        snapshotBillingModel: string;
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    expect(entry.snapshotBillingModel).toBe("HOURLY");
    expect(entry.snapshotRate).toBe("80.5000");
    expect(entry.snapshotCurrency).toBe("EUR");
    expect(entry.workspaceId).toBe(context.workspaceId);
    expect(entry.contractId).toBe(contract.id);
  });

  it("does not recapture snapshot on duration, billable, or description updates", async () => {
    const context = await createWorkspaceContext("update");
    const { client, contract } = await setupHourlyContract(context, "80");

    const created = await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 60,
        description: "Original",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const updated = await updateTimeEntry(
      context,
      created.id,
      { durationMinutes: 180, description: "Changed", billable: false },
      repositories.timeEntries,
    );

    expect(updated.durationMinutes).toBe(180);
    expect(updated.description).toBe("Changed");
    expect(updated.billable).toBe(false);
    expect(updated.workDate).toEqual(created.workDate);
    expect(updated.clientId).toBe(created.clientId);
    expect(updated.contractId).toBe(created.contractId);
    expect(updated.snapshotBillingModel).toBe("HOURLY");
    expect(updated.snapshotRate).toBe("80.0000");
    expect(updated.snapshotCurrency).toBe("EUR");
  });

  it("keeps existing snapshots after Contract commercial edits and captures current values on new work", async () => {
    const context = await createWorkspaceContext("mutate");
    const { client, contract } = await setupHourlyContract(context, "80", "EUR");

    const first = await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    await updateContract(
      context,
      contract.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        billingModel: "DAILY",
        rate: "100",
        currency: "USD",
      },
      repositories.clients,
      repositories.contracts,
    );

    const persistedFirst = await getTimeEntry(context, first.id, repositories.timeEntries);
    expect(persistedFirst.snapshotBillingModel).toBe("HOURLY");
    expect(persistedFirst.snapshotRate).toBe("80.0000");
    expect(persistedFirst.snapshotCurrency).toBe("EUR");

    const second = await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-16"),
        durationMinutes: 90,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    expect(second.snapshotBillingModel).toBe("DAILY");
    expect(second.snapshotRate).toBe("100.0000");
    expect(second.snapshotCurrency).toBe("USD");
  });

  it("persists distinct same-day DAILY snapshots without computing Accrued", async () => {
    const context = await createWorkspaceContext("daily");
    const { client, contract } = await setupHourlyContract(context, "78");

    await updateContract(
      context,
      contract.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        billingModel: "DAILY",
        rate: "78",
        currency: "EUR",
      },
      repositories.clients,
      repositories.contracts,
    );

    const morning = await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 180,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    await updateContract(
      context,
      contract.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        billingModel: "DAILY",
        rate: "90",
        currency: "EUR",
      },
      repositories.clients,
      repositories.contracts,
    );

    const afternoon = await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 300,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    expect(morning.snapshotRate).toBe("78.0000");
    expect(afternoon.snapshotRate).toBe("90.0000");
    expect(morning.snapshotBillingModel).toBe("DAILY");
    expect(afternoon.snapshotBillingModel).toBe("DAILY");
    expect(morning.workDate).toEqual(afternoon.workDate);
  });

  it("backfills repository-created rows from the current Contract and leaves quantity facts unchanged", async () => {
    const context = await createWorkspaceContext("backfill");
    const { client, contract } = await setupHourlyContract(context, "80");

    const entry = await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: date("2026-06-15"),
      durationMinutes: 45,
      description: "Legacy",
      billable: false,
    });

    expect(entry.snapshotBillingModel).toBe(contract.billingModel);
    expect(entry.snapshotRate).toBe(contract.rate);
    expect(entry.snapshotCurrency).toBe(contract.currency);
    expect(entry.durationMinutes).toBe(45);
    expect(entry.workDate).toEqual(date("2026-06-15"));
    expect(entry.billable).toBe(false);
    expect(entry.contractId).toBe(contract.id);

    const nullSnapshots = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "TimeEntry"
      WHERE "snapshotBillingModel" IS NULL
         OR "snapshotRate" IS NULL
         OR "snapshotCurrency" IS NULL
    `;
    expect(Number(nullSnapshots[0]?.count)).toBe(0);
  });

  it("cannot create a TimeEntry or snapshot from a foreign Contract", async () => {
    const workspaceA = await createWorkspaceContext("iso-a");
    const workspaceB = await createWorkspaceContext("iso-b");
    const { contract: foreignContract } = await setupHourlyContract(workspaceA, "80");
    const { client: localClient } = await setupHourlyContract(workspaceB, "50");

    await expect(
      createTimeEntry(
        workspaceB,
        {
          clientId: localClient.id,
          contractId: foreignContract.id,
          workDate: date("2026-06-15"),
          durationMinutes: 60,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);

    await expect(
      repositories.timeEntries.recordTimeEntry(workspaceB.workspaceId, {
        userId: workspaceB.userId,
        clientId: localClient.id,
        contractId: foreignContract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 60,
        billable: true,
      }),
    ).rejects.toBeTruthy();
  });
});
