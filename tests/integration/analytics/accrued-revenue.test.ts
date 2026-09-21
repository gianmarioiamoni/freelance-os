// tests/integration/analytics/accrued-revenue.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { updateContract } from "@/application/contracts/update-contract";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotValidForDateError } from "@/domain/time-entry-errors";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import {
  getCurrentMonthPeriod,
  getCurrentWeekPeriod,
  getCurrentYearPeriod,
  getDateRangePeriod,
  getMonthPeriod,
} from "@/lib/analytics-periods";

import { createWorkspaceGraph } from "../persistence/fixtures";
import { date, repositories, runInTransaction } from "../persistence/helpers";

async function workspace(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `accrued-${suffix}`,
    { name: `Accrued ${suffix}`, timezone: "Europe/Rome", currency: "EUR" },
    { runInTransaction },
  );
  return created.context;
}

async function hourlyContract(
  context: WorkspaceContext,
  options?: { rate?: string; currency?: string; validTo?: string | null },
) {
  const client = await createClient(
    context,
    {
      companyName: "Accrued Client",
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
      validTo: options?.validTo === undefined ? "2026-12-31" : options.validTo,
      billingModel: "HOURLY",
      rate: options?.rate ?? "80",
      currency: options?.currency ?? "EUR",
    },
    repositories.clients,
    repositories.contracts,
  );
  return { client, contract };
}

function service() {
  return new AnalyticsService(repositories.analytics, repositories.members);
}

function june(): ReturnType<typeof getDateRangePeriod> {
  return getDateRangePeriod(date("2026-06-01"), date("2026-06-30"));
}

async function dailyWorkspace(suffix: string, timezone: string) {
  const created = await repositories.workspaces.createWorkspace({
    name: `Accrued Daily TZ ${suffix}`,
    timezone,
    currency: "EUR",
  });
  const userId = `accrued-daily-tz-${suffix}`;
  await repositories.members.addMember({
    workspaceId: created.id,
    userId,
    role: "OWNER",
  });
  const context: WorkspaceContext = {
    workspaceId: created.id,
    userId,
    role: "OWNER",
    timezone,
  };
  const { client, contract } = await hourlyContract(context, { rate: "100" });
  await updateContract(
    context,
    contract.id,
    {
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      billingModel: "DAILY",
      rate: "100",
      currency: "EUR",
    },
    repositories.clients,
    repositories.contracts,
  );
  return { context, client, contract };
}

async function addDailyEntry(
  context: WorkspaceContext,
  clientId: string,
  contractId: string,
  workDate: Date,
) {
  return createTimeEntry(
    context,
    {
      clientId,
      contractId,
      workDate,
      durationMinutes: 180,
      billable: true,
    },
    repositories.clients,
    repositories.contracts,
    repositories.timeEntries,
  );
}

describe("Accrued Revenue integration", () => {
  it("uses the historical snapshot after a live Contract rate change", async () => {
    const context = await workspace("rate-change");
    const { client, contract } = await hourlyContract(context, { rate: "80" });

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
      },
      repositories.clients,
      repositories.contracts,
    );

    const first = await service().getAccruedRevenue(context, june());
    expect(first.byCurrency[0]?.unrounded).toBe(160);

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-16"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const second = await service().getAccruedRevenue(context, june());
    expect(second.byCurrency[0]?.unrounded).toBe(280);
  });

  it("uses snapshot currency after a live Contract currency change", async () => {
    const context = await workspace("currency-change");
    const { client, contract } = await hourlyContract(context, {
      rate: "100",
      currency: "EUR",
    });

    await createTimeEntry(
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
        billingModel: "HOURLY",
        rate: "100",
        currency: "USD",
      },
      repositories.clients,
      repositories.contracts,
    );

    const result = await service().getAccruedRevenue(context, june());
    expect(result.byCurrency).toEqual([
      { currency: "EUR", unrounded: 100, published: 100 },
    ]);
  });

  it("weights DAILY same-day snapshots and keeps Contracts independent", async () => {
    const context = await workspace("daily-weighted");
    const { client, contract } = await hourlyContract(context, { rate: "78" });

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

    await createTimeEntry(
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

    await createTimeEntry(
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

    const otherClient = await createClient(
      context,
      {
        companyName: "Project B",
        email: "",
        phone: "",
        address: "",
        vatNumber: "",
        notes: "",
      },
      repositories.clients,
    );
    const otherContract = await createContract(
      context,
      {
        clientId: otherClient.id,
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        billingModel: "DAILY",
        rate: "120",
        currency: "EUR",
      },
      repositories.clients,
      repositories.contracts,
    );
    await createTimeEntry(
      context,
      {
        clientId: otherClient.id,
        contractId: otherContract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 300,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const result = await service().getAccruedRevenue(context, june());
    expect(result.byCurrency[0]?.unrounded).toBe(205.5);
    expect(result.byContract).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contractId: contract.id,
          currency: "EUR",
          unrounded: 85.5,
          published: 86,
        }),
        expect.objectContaining({
          contractId: otherContract.id,
          currency: "EUR",
          unrounded: 120,
          published: 120,
        }),
      ]),
    );
  });

  it("19. persists mixed-currency DAILY snapshots without merging them", async () => {
    const context = await workspace("mixed-currency-daily");
    const { client, contract } = await hourlyContract(context, { rate: "78" });

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

    await createTimeEntry(
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
        currency: "USD",
      },
      repositories.clients,
      repositories.contracts,
    );

    await createTimeEntry(
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

    const result = await service().getAccruedRevenue(context, june());
    expect(result.byCurrency).toEqual([
      { currency: "EUR", unrounded: 29.25, published: 29 },
      { currency: "USD", unrounded: 56.25, published: 56 },
    ]);
    expect(result).not.toHaveProperty("total");
  });

  it("20. retains a historical TimeEntry that later falls outside live validity", async () => {
    const context = await workspace("retain-oov");
    const { client, contract } = await hourlyContract(context, { rate: "80" });

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
        validTo: "2026-03-01",
        billingModel: "HOURLY",
        rate: "80",
        currency: "EUR",
      },
      repositories.clients,
      repositories.contracts,
    );

    const result = await service().getAccruedRevenue(context, june());
    expect(result.byCurrency[0]?.unrounded).toBe(160);
  });

  it("21. still rejects a new TimeEntry outside live Contract validity", async () => {
    const context = await workspace("reject-invalid");
    const { client, contract } = await hourlyContract(context, { rate: "80" });

    await updateContract(
      context,
      contract.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-03-01",
        billingModel: "HOURLY",
        rate: "80",
        currency: "EUR",
      },
      repositories.clients,
      repositories.contracts,
    );

    await expect(
      createTimeEntry(
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
      ),
    ).rejects.toThrow(ContractNotValidForDateError);
  });

  it("22. accrues normally for an ongoing Contract", async () => {
    const context = await workspace("ongoing");
    const { client, contract } = await hourlyContract(context, {
      rate: "50",
      validTo: null,
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

    const result = await service().getAccruedRevenue(context, june());
    expect(result.byCurrency[0]?.unrounded).toBe(100);
  });

  describe("periods and timezone", () => {
    const clock = new Date("2026-09-15T12:00:00.000Z");

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(clock);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("23–27. current month/week/year, historical month, and custom period", async () => {
      const context = await workspace("periods");
      const { client, contract } = await hourlyContract(context, { rate: "60" });

      await createTimeEntry(
        context,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-08-10"),
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
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-09-10"),
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
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-09-14"),
          durationMinutes: 120,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      const analytics = service();
      const month = await analytics.getAccruedRevenue(
        context,
        getCurrentMonthPeriod(context.timezone, clock),
      );
      const week = await analytics.getAccruedRevenue(
        context,
        getCurrentWeekPeriod(context.timezone, clock),
      );
      const year = await analytics.getAccruedRevenue(
        context,
        getCurrentYearPeriod(context.timezone, clock),
      );
      const historical = await analytics.getAccruedRevenue(
        context,
        getMonthPeriod(2026, 8),
      );
      const custom = await analytics.getAccruedRevenue(
        context,
        getDateRangePeriod(date("2026-09-14"), date("2026-09-15")),
      );

      expect(month.byCurrency[0]?.unrounded).toBe(180);
      expect(week.byCurrency[0]?.unrounded).toBe(120);
      expect(year.byCurrency[0]?.unrounded).toBe(240);
      expect(historical.byCurrency[0]?.unrounded).toBe(60);
      expect(custom.byCurrency[0]?.unrounded).toBe(120);
    });

    it("28. workspace timezone determines current-period membership", async () => {
      const nyClock = new Date("2026-09-16T01:00:00.000Z");
      vi.setSystemTime(nyClock);

      const created = await createFirstWorkspace(
        "accrued-tz",
        { name: "NY Accrued", timezone: "America/New_York", currency: "USD" },
        { runInTransaction },
      );
      const context = created.context;
      const { client, contract } = await hourlyContract(context, {
        rate: "100",
        currency: "USD",
      });

      await createTimeEntry(
        context,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-09-15"),
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
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-09-16"),
          durationMinutes: 60,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      const result = await service().getAccruedRevenue(
        context,
        getCurrentMonthPeriod(context.timezone, nyClock),
      );
      expect(result.period.endDate).toEqual(date("2026-09-15"));
      expect(result.byCurrency[0]?.unrounded).toBe(100);
    });

    it("DAILY UTC workspace uses workspace today, not a later UTC-shifted day", async () => {
      const utcClock = new Date("2026-09-16T01:00:00.000Z");
      vi.setSystemTime(utcClock);

      const { context, client, contract } = await dailyWorkspace("utc", "UTC");
      await addDailyEntry(context, client.id, contract.id, date("2026-09-15"));
      await addDailyEntry(context, client.id, contract.id, date("2026-09-16"));

      const result = await service().getAccruedRevenue(
        context,
        getCurrentWeekPeriod(context.timezone, utcClock),
      );

      expect(result.timezone).toBe("UTC");
      expect(result.period.endDate).toEqual(date("2026-09-16"));
      expect(result.byCurrency[0]?.unrounded).toBe(200);
    });

    it("DAILY positive-offset workspace includes the workspace calendar day after UTC midnight", async () => {
      const tokyoClock = new Date("2026-09-15T22:00:00.000Z");
      vi.setSystemTime(tokyoClock);

      const { context, client, contract } = await dailyWorkspace(
        "tokyo",
        "Asia/Tokyo",
      );
      await addDailyEntry(context, client.id, contract.id, date("2026-09-15"));
      await addDailyEntry(context, client.id, contract.id, date("2026-09-16"));

      const result = await service().getAccruedRevenue(
        context,
        getCurrentWeekPeriod(context.timezone, tokyoClock),
      );

      expect(result.timezone).toBe("Asia/Tokyo");
      expect(result.period.endDate).toEqual(date("2026-09-16"));
      expect(result.byCurrency[0]?.unrounded).toBe(200);
    });

    it("DAILY negative-offset workspace keeps revenue on the workspace calendar day", async () => {
      const nyClock = new Date("2026-09-16T01:00:00.000Z");
      vi.setSystemTime(nyClock);

      const { context, client, contract } = await dailyWorkspace(
        "ny-daily",
        "America/New_York",
      );
      await addDailyEntry(context, client.id, contract.id, date("2026-09-15"));
      await addDailyEntry(context, client.id, contract.id, date("2026-09-16"));

      const result = await service().getAccruedRevenue(
        context,
        getCurrentWeekPeriod(context.timezone, nyClock),
      );

      expect(result.timezone).toBe("America/New_York");
      expect(result.period.endDate).toEqual(date("2026-09-15"));
      expect(result.byCurrency[0]?.unrounded).toBe(100);
    });
  });

  it("29. process-local date getters do not shift UTC workDate membership", async () => {
    const context = await workspace("process-tz");
    const { client, contract } = await hourlyContract(context, { rate: "80" });

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-03-01"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const march = await service().getAccruedRevenue(
      context,
      getMonthPeriod(2026, 3),
    );
    const february = await service().getAccruedRevenue(
      context,
      getMonthPeriod(2026, 2),
    );

    expect(march.byCurrency[0]?.unrounded).toBe(80);
    expect(february.byCurrency).toEqual([]);
  });

  it("35–37. workspace A cannot read workspace B Accrued, contracts, or TimeEntries", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "accrued-A");
    const workspaceB = await createWorkspaceGraph(repositories, "accrued-B");

    await repositories.timeEntries.recordTimeEntry(workspaceA.workspaceId, {
      userId: workspaceA.userId,
      clientId: workspaceA.clientId,
      contractId: workspaceA.contractId,
      workDate: date("2026-06-15"),
      durationMinutes: 60,
      billable: true,
    });
    await repositories.timeEntries.recordTimeEntry(workspaceB.workspaceId, {
      userId: workspaceB.userId,
      clientId: workspaceB.clientId,
      contractId: workspaceB.contractId,
      workDate: date("2026-06-15"),
      durationMinutes: 480,
      billable: true,
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
    const accruedA = await analytics.getAccruedRevenue(contextA, june());
    const accruedB = await analytics.getAccruedRevenue(contextB, june());

    expect(accruedA.byCurrency[0]?.unrounded).toBe(80);
    expect(accruedB.byCurrency[0]?.unrounded).toBe(640);
    expect(accruedA.byContract[0]?.contractId).toBe(workspaceA.contractId);
    expect(accruedB.byContract[0]?.contractId).toBe(workspaceB.contractId);
  });

  it("38. a non-member cannot access Accrued", async () => {
    const graph = await createWorkspaceGraph(repositories, "accrued-member");
    const stranger: WorkspaceContext = {
      workspaceId: graph.workspaceId,
      userId: "intruder-accrued",
      role: "OWNER",
      timezone: "UTC",
    };

    await expect(service().getAccruedRevenue(stranger, june())).rejects.toThrow(
      UnauthorizedWorkspaceAccessError,
    );
  });

  it("includes archived-client history and leaves R1 minutes/utilization unchanged", async () => {
    const context = await workspace("archived-regression");
    const { client, contract } = await hourlyContract(context, { rate: "80" });

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
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-16"),
        durationMinutes: 60,
        billable: false,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    await repositories.clients.archiveClient(context.workspaceId, client.id);

    const analytics = service();
    const period = june();
    const accrued = await analytics.getAccruedRevenue(context, period);
    const monthly = await analytics.getMonthlyAnalytics(context, period);

    expect(accrued.byCurrency[0]?.unrounded).toBe(160);
    expect(monthly.totalMinutes).toBe(180);
    expect(monthly.billableMinutes).toBe(120);
    expect(monthly.nonBillableMinutes).toBe(60);
    expect(monthly.billablePercentage).toBe((120 / 180) * 100);
    expect(monthly.clientAllocations[0]?.isArchived).toBe(true);
    expect(monthly.contractUtilizations[0]?.consumedMinutes).toBe(180);
    expect(monthly.accrued.byCurrency[0]?.unrounded).toBe(160);
    expect(monthly.accrued).toEqual(accrued);
    expect(monthly.expected.byCurrency).toEqual([]);
    expect(monthly).not.toHaveProperty("forecast");
  });
});
