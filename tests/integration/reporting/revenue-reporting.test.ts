// tests/integration/reporting/revenue-reporting.test.ts
import { describe, expect, it } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { ReportingService } from "@/application/reporting/reporting-service";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

import { createWorkspaceGraph } from "../persistence/fixtures";
import { date, repositories, runInTransaction } from "../persistence/helpers";

async function workspace(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `report-rev-${suffix}`,
    { name: `Report Revenue ${suffix}`, timezone: "Europe/Rome", currency: "EUR" },
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

function services() {
  const analytics = new AnalyticsService(repositories.analytics, repositories.members);
  return { analytics, reporting: new ReportingService(analytics) };
}

const JUNE = {
  kind: "custom" as const,
  startDate: date("2026-06-01"),
  endDate: date("2026-06-30"),
};

describe("ReportingService revenue integration", () => {
  it("publishes HOURLY Accrued and Expected on ContractReport", async () => {
    const context = await workspace("hourly");
    const client = await addClient(context, "Hourly");
    const contract = await addContract(context, client.id, {
      monthlyContractedHours: "80",
    });
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-10"),
        durationMinutes: 120,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { analytics, reporting } = services();
    const report = await reporting.getContractReport(context, JUNE);
    const monthly = await analytics.getMonthlyAnalytics(context, {
      startDate: JUNE.startDate,
      endDate: JUNE.endDate,
    });

    expect(report.accrued.byCurrency).toEqual([
      { currency: "EUR", unrounded: 160, published: 160 },
    ]);
    expect(report.expected.byCurrency).toEqual([
      { currency: "EUR", unrounded: 6400, published: 6400 },
    ]);
    expect(monthly.accrued).toEqual(report.accrued);
    expect(monthly.expected).toEqual(report.expected);
    expect(monthly.totalMinutes).toBe(120);
    expect(monthly.billableMinutes).toBe(120);
    expect(report.forecast).toBeNull();
    expect(monthly.forecast).toBeNull();
  });

  it("publishes DAILY Expected as null and Accrued from billable days", async () => {
    const context = await workspace("daily");
    const client = await addClient(context, "Daily");
    const contract = await addContract(context, client.id, {
      billingModel: "DAILY",
      rate: "400",
      monthlyContractedHours: "80",
    });
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-10"),
        durationMinutes: 180,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const report = await services().reporting.getContractReport(context, JUNE);

    expect(report.accrued.byCurrency).toEqual([
      { currency: "EUR", unrounded: 400, published: 400 },
    ]);
    expect(report.expected.byCurrency).toEqual([]);
    expect(report.expected.byContract).toEqual([
      {
        contractId: contract.id,
        currency: "EUR",
        unrounded: null,
        published: null,
      },
    ]);
  });

  it("publishes Expected null when monthlyContractedMinutes is null", async () => {
    const context = await workspace("unlimited");
    const client = await addClient(context, "Unlimited");
    const contract = await addContract(context, client.id, {
      monthlyContractedHours: null,
    });
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-10"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const report = await services().reporting.getContractReport(context, JUNE);

    expect(report.accrued.byCurrency).toEqual([
      { currency: "EUR", unrounded: 80, published: 80 },
    ]);
    expect(report.expected.byCurrency).toEqual([]);
    expect(report.expected.byContract).toEqual([
      {
        contractId: contract.id,
        currency: "EUR",
        unrounded: null,
        published: null,
      },
    ]);
  });

  it("pro-rates Expected on a partial validity overlap", async () => {
    const context = await workspace("prorata");
    const client = await addClient(context, "Pro Rata");
    await addContract(context, client.id, {
      validFrom: "2026-06-16",
      validTo: "2026-12-31",
      monthlyContractedHours: "80",
    });

    const report = await services().reporting.getContractReport(context, JUNE);
    expect(report.expected.byCurrency[0]?.unrounded).toBe(3200);
    expect(report.accrued.byCurrency).toEqual([]);
  });

  it("keeps mixed currencies separate with no FX total", async () => {
    const context = await workspace("mixed");
    const eurClient = await addClient(context, "EUR");
    const usdClient = await addClient(context, "USD");
    const eur = await addContract(context, eurClient.id, {
      currency: "EUR",
      rate: "80",
      monthlyContractedHours: "80",
    });
    const usd = await addContract(context, usdClient.id, {
      currency: "USD",
      rate: "100",
      monthlyContractedHours: "80",
    });
    await createTimeEntry(
      context,
      {
        clientId: eurClient.id,
        contractId: eur.id,
        workDate: date("2026-06-10"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      context,
      {
        clientId: usdClient.id,
        contractId: usd.id,
        workDate: date("2026-06-11"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { analytics, reporting } = services();
    const report = await reporting.getContractReport(context, JUNE);
    const monthly = await analytics.getMonthlyAnalytics(context, {
      startDate: JUNE.startDate,
      endDate: JUNE.endDate,
    });

    expect(report.accrued.byCurrency).toEqual([
      { currency: "EUR", unrounded: 80, published: 80 },
      { currency: "USD", unrounded: 100, published: 100 },
    ]);
    expect(report.expected.byCurrency).toEqual([
      { currency: "EUR", unrounded: 6400, published: 6400 },
      { currency: "USD", unrounded: 8000, published: 8000 },
    ]);
    expect(report.accrued).not.toHaveProperty("total");
    expect(report.expected).not.toHaveProperty("total");
    expect(monthly.accrued).not.toHaveProperty("total");
    expect(monthly.expected).not.toHaveProperty("total");
  });

  it("isolates report revenue across workspaces", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "rev-rep-A");
    const workspaceB = await createWorkspaceGraph(repositories, "rev-rep-B");

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

    const reporting = services().reporting;
    const reportA = await reporting.getContractReport(contextA, JUNE);
    const reportB = await reporting.getContractReport(contextB, JUNE);

    expect(reportA.expected.byCurrency[0]?.unrounded).toBe(6400);
    expect(reportB.expected.byCurrency[0]?.unrounded).toBe(8000);
    expect(reportA.expected.byContract[0]?.contractId).toBe(workspaceA.contractId);
    expect(reportB.expected.byContract[0]?.contractId).toBe(workspaceB.contractId);
    expect(reportA.accrued.byContract.every((row) => row.contractId === workspaceA.contractId)).toBe(true);
    expect(reportB.accrued.byContract.every((row) => row.contractId === workspaceB.contractId)).toBe(true);
  });

  it("rejects a non-member from report revenue", async () => {
    const graph = await createWorkspaceGraph(repositories, "rev-rep-member");
    const stranger: WorkspaceContext = {
      workspaceId: graph.workspaceId,
      userId: "intruder-rev-rep",
      role: "OWNER",
      timezone: "UTC",
    };

    await expect(
      services().reporting.getContractReport(stranger, JUNE),
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it("does not attach revenue to HoursByClient", async () => {
    const context = await workspace("hours-only");
    const client = await addClient(context, "Hours");
    const contract = await addContract(context, client.id, {
      monthlyContractedHours: "80",
    });
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-10"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const hours = await services().reporting.getHoursByClient(context, JUNE);
    expect(hours.clientAllocations[0]?.totalMinutes).toBe(60);
    expect(hours).not.toHaveProperty("accrued");
    expect(hours).not.toHaveProperty("expected");
  });
});
