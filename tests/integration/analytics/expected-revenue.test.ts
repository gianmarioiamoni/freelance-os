// tests/integration/analytics/expected-revenue.test.ts
import { describe, expect, it } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { updateContract } from "@/application/contracts/update-contract";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import {
  getCurrentMonthPeriod,
  getDateRangePeriod,
  getMonthPeriod,
} from "@/lib/analytics-periods";

import { createWorkspaceGraph } from "../persistence/fixtures";
import { date, repositories, runInTransaction } from "../persistence/helpers";

async function workspace(suffix: string, timezone = "Europe/Rome"): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `expected-${suffix}`,
    { name: `Expected ${suffix}`, timezone, currency: "EUR" },
    { runInTransaction },
  );
  return created.context;
}

async function addClient(context: WorkspaceContext, name: string) {
  return createClient(
    context,
    {
      companyName: name,
      email: "",
      phone: "",
      address: "",
      vatNumber: "",
      notes: "",
    },
    repositories.clients,
  );
}

async function addContract(
  context: WorkspaceContext,
  clientId: string,
  options?: {
    rate?: string;
    currency?: string;
    validFrom?: string;
    validTo?: string | null;
    billingModel?: "HOURLY" | "DAILY";
    monthlyContractedHours?: string | null;
  },
) {
  return createContract(
    context,
    {
      clientId,
      validFrom: options?.validFrom ?? "2026-01-01",
      validTo: options?.validTo === undefined ? "2026-12-31" : options.validTo,
      billingModel: options?.billingModel ?? "HOURLY",
      rate: options?.rate ?? "80",
      currency: options?.currency ?? "EUR",
      monthlyContractedHours: options?.monthlyContractedHours,
    },
    repositories.clients,
    repositories.contracts,
  );
}

function service() {
  return new AnalyticsService(repositories.analytics, repositories.members);
}

function june() {
  return getDateRangePeriod(date("2026-06-01"), date("2026-06-30"));
}

describe("Expected Revenue integration", () => {
  it("full-period HOURLY uses live rate × monthly capacity", async () => {
    const context = await workspace("full-period");
    const client = await addClient(context, "Full Period");
    const contract = await addContract(context, client.id, {
      monthlyContractedHours: "80",
    });

    const result = await service().getExpectedRevenue(context, june());

    expect(result.byCurrency).toEqual([
      { currency: "EUR", unrounded: 6400, published: 6400 },
    ]);
    expect(result.byContract).toEqual([
      {
        contractId: contract.id,
        currency: "EUR",
        unrounded: 6400,
        published: 6400,
      },
    ]);
  });

  it("pro-rates a contract that starts inside the period", async () => {
    const context = await workspace("pro-rata");
    const client = await addClient(context, "Pro Rata");
    await addContract(context, client.id, {
      validFrom: "2026-06-16",
      validTo: "2026-12-31",
      monthlyContractedHours: "80",
    });

    const result = await service().getExpectedRevenue(context, june());
    expect(result.byCurrency[0]?.unrounded).toBe(3200);
  });

  it("ongoing contract overlaps through the period end", async () => {
    const context = await workspace("ongoing");
    const client = await addClient(context, "Ongoing");
    await addContract(context, client.id, {
      validTo: null,
      monthlyContractedHours: "80",
    });

    const result = await service().getExpectedRevenue(context, june());
    expect(result.byCurrency[0]?.unrounded).toBe(6400);
  });

  it("HOURLY without capacity and DAILY remain null", async () => {
    const context = await workspace("null-cases");
    const hourlyClient = await addClient(context, "Unlimited");
    const dailyClient = await addClient(context, "Daily");
    const unlimited = await addContract(context, hourlyClient.id, {
      monthlyContractedHours: null,
    });
    const daily = await addContract(context, dailyClient.id, {
      billingModel: "DAILY",
      monthlyContractedHours: "80",
    });

    const result = await service().getExpectedRevenue(context, june());
    expect(result.byCurrency).toEqual([]);
    expect(result.byContract).toEqual(
      expect.arrayContaining([
        {
          contractId: unlimited.id,
          currency: "EUR",
          unrounded: null,
          published: null,
        },
        {
          contractId: daily.id,
          currency: "EUR",
          unrounded: null,
          published: null,
        },
      ]),
    );
  });

  it("uses the live Contract rate, not TimeEntry snapshots", async () => {
    const context = await workspace("live-rate");
    const client = await addClient(context, "Live Rate");
    const contract = await addContract(context, client.id, {
      rate: "80",
      monthlyContractedHours: "80",
    });

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 120,
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
        billingModel: "HOURLY",
        rate: "120",
        currency: "EUR",
        monthlyContractedHours: "80",
      },
      repositories.clients,
      repositories.contracts,
    );

    const analytics = service();
    const expectedRevenue = await analytics.getExpectedRevenue(context, june());
    const accruedRevenue = await analytics.getAccruedRevenue(context, june());

    expect(expectedRevenue.byCurrency[0]?.unrounded).toBe(9600);
    expect(accruedRevenue.byCurrency[0]?.unrounded).toBe(160);
  });

  it("TimeEntries do not change Expected", async () => {
    const context = await workspace("no-time-dep");
    const client = await addClient(context, "Independent");
    const contract = await addContract(context, client.id, {
      monthlyContractedHours: "80",
    });

    const analytics = service();
    const before = await analytics.getExpectedRevenue(context, june());

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 480,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const after = await analytics.getExpectedRevenue(context, june());
    const accrued = await analytics.getAccruedRevenue(context, june());

    expect(after).toEqual(before);
    expect(accrued.byCurrency[0]?.unrounded).toBe(640);
  });

  it("keeps currencies separate", async () => {
    const context = await workspace("currency");
    const eurClient = await addClient(context, "EUR Client");
    const usdClient = await addClient(context, "USD Client");
    await addContract(context, eurClient.id, {
      currency: "EUR",
      rate: "80",
      monthlyContractedHours: "80",
    });
    await addContract(context, usdClient.id, {
      currency: "USD",
      rate: "100",
      monthlyContractedHours: "80",
    });

    const result = await service().getExpectedRevenue(context, june());
    expect(result.byCurrency).toEqual([
      { currency: "EUR", unrounded: 6400, published: 6400 },
      { currency: "USD", unrounded: 8000, published: 8000 },
    ]);
    expect(result).not.toHaveProperty("total");
  });

  it("includes archived-client contracts", async () => {
    const context = await workspace("archived");
    const client = await addClient(context, "Archived");
    const contract = await addContract(context, client.id, {
      monthlyContractedHours: "80",
    });
    await repositories.clients.archiveClient(context.workspaceId, client.id);

    const result = await service().getExpectedRevenue(context, june());
    expect(result.byContract[0]?.contractId).toBe(contract.id);
    expect(result.byCurrency[0]?.unrounded).toBe(6400);
  });

  it("workspace timezone determines current-period Expected", async () => {
    const nyClock = new Date("2026-09-16T01:00:00.000Z");

    const context = await workspace("tz", "America/New_York");
    const client = await addClient(context, "TZ");
    await addContract(context, client.id, {
      validFrom: "2026-09-16",
      validTo: null,
      monthlyContractedHours: "80",
    });

    const nyPeriod = getCurrentMonthPeriod(context.timezone, nyClock);
    const utcPeriod = getCurrentMonthPeriod("UTC", nyClock);
    const analytics = service();

    const ny = await analytics.getExpectedRevenue(context, nyPeriod);
    const utc = await analytics.getExpectedRevenue(context, utcPeriod);

    expect(nyPeriod.endDate).toEqual(date("2026-09-15"));
    expect(utcPeriod.endDate).toEqual(date("2026-09-16"));
    expect(ny.byCurrency).toEqual([]);
    expect(utc.byCurrency[0]?.unrounded).toBe(80 * (4800 * (1 / 16) / 60));
  });

  it("historical month uses the full calendar month", async () => {
    const context = await workspace("historical");
    const client = await addClient(context, "Historical");
    await addContract(context, client.id, {
      monthlyContractedHours: "80",
    });

    const result = await service().getExpectedRevenue(
      context,
      getMonthPeriod(2026, 6),
    );
    expect(result.period).toEqual(june());
    expect(result.byCurrency[0]?.unrounded).toBe(6400);
  });

  it("workspace A cannot read workspace B Expected", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "expected-A");
    const workspaceB = await createWorkspaceGraph(repositories, "expected-B");

    await repositories.contracts.updateContract(workspaceA.workspaceId, workspaceA.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });
    await repositories.contracts.updateContract(workspaceB.workspaceId, workspaceB.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });

    const contextA: WorkspaceContext = {
      workspaceId: workspaceA.workspaceId,
      userId: workspaceA.userId,
      role: "OWNER",
      timezone: "UTC",
    };
    const contextB: WorkspaceContext = {
      workspaceId: workspaceB.workspaceId,
      userId: workspaceB.userId,
      role: "OWNER",
      timezone: "UTC",
    };

    const analytics = service();
    const expectedA = await analytics.getExpectedRevenue(contextA, june());
    const expectedB = await analytics.getExpectedRevenue(contextB, june());

    expect(expectedA.byCurrency[0]?.unrounded).toBe(6400);
    expect(expectedB.byCurrency[0]?.unrounded).toBe(8000);
    expect(expectedA.byContract[0]?.contractId).toBe(workspaceA.contractId);
    expect(expectedB.byContract[0]?.contractId).toBe(workspaceB.contractId);
  });

  it("a non-member cannot access Expected", async () => {
    const graph = await createWorkspaceGraph(repositories, "expected-member");
    const stranger: WorkspaceContext = {
      workspaceId: graph.workspaceId,
      userId: "intruder-expected",
      role: "OWNER",
      timezone: "UTC",
    };

    await expect(service().getExpectedRevenue(stranger, june())).rejects.toThrow(
      UnauthorizedWorkspaceAccessError,
    );
  });
});
