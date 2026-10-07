// tests/integration/application/reporting/revenue-overview.test.ts
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import { WorkspaceInvoiceService } from "@/application/invoices/workspace-invoice-service";
import { ReportingService } from "@/application/reporting/reporting-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma, repositories, runInTransaction } from "../../persistence/helpers";

describe("ReportingService.getRevenueOverview (integration)", () => {
  let contextA: WorkspaceContext;
  let contextB: WorkspaceContext;
  let reporting: ReportingService;
  let contractAId: string;

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Workspace" CASCADE');

    const analytics = new AnalyticsService(
      repositories.analytics,
      repositories.members,
    );
    const invoices = new WorkspaceInvoiceService(
      repositories.invoices,
      repositories.payments,
      repositories.clients,
      repositories.contracts,
    );
    reporting = new ReportingService(analytics, invoices);

    const workspaceA = await createFirstWorkspace(
      "user-a",
      { name: "Workspace A", timezone: "Europe/Rome", currency: "EUR" },
      { runInTransaction },
    );
    contextA = {
      workspaceId: workspaceA.workspace.id,
      userId: workspaceA.membership.userId,
      role: workspaceA.membership.role,
      timezone: "Europe/Rome",
    };

    const clientA = await repositories.clients.createClient(contextA.workspaceId, {
      companyName: "Client A",
      status: "ACTIVE",
    });
    const contractA = await repositories.contracts.createContract(contextA.workspaceId, {
      clientId: clientA.id,
      validFrom: new Date("2026-01-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      monthlyContractedMinutes: 9600,
      paymentTermsDays: 30,
    });
    contractAId = contractA.id;

    const workspaceB = await createFirstWorkspace(
      "user-b",
      { name: "Workspace B", timezone: "America/New_York", currency: "USD" },
      { runInTransaction },
    );
    contextB = {
      workspaceId: workspaceB.workspace.id,
      userId: workspaceB.membership.userId,
      role: workspaceB.membership.role,
      timezone: "America/New_York",
    };
  });

  it("isolates invoice revenue by workspace", async () => {
    await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractAId,
      invoiceDate: new Date("2026-10-05"),
      amount: "1500.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: new Date("2026-11-04"),
    });

    const overviewB = await reporting.getRevenueOverview(contextB, {
      kind: "custom",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-31"),
    });

    expect(overviewB.invoiced).toEqual([]);
    expect(overviewB.paid).toEqual([]);
    expect(overviewB.outstanding).toEqual([]);
  });

  it("keeps Accrued and invoice metrics currency-separated", async () => {
    const invoice = await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractAId,
      invoiceDate: new Date("2026-10-05"),
      amount: "1000.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: new Date("2026-11-04"),
    });
    await repositories.payments.createPayment(contextA.workspaceId, {
      invoiceId: invoice.id,
      paymentDate: new Date("2026-10-10"),
      amount: "250.0000",
      currency: "EUR",
    });

    const overview = await reporting.getRevenueOverview(contextA, {
      kind: "custom",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-31"),
    });

    expect(overview.invoiced).toEqual([{ currency: "EUR", amount: "1000.0000" }]);
    expect(overview.paid).toEqual([{ currency: "EUR", amount: "250.0000" }]);
    expect(overview.outstanding).toEqual([{ currency: "EUR", amount: "750.0000" }]);
    expect(overview.accrued.byCurrency.every((row) => row.currency.length === 3)).toBe(true);
  });
});
