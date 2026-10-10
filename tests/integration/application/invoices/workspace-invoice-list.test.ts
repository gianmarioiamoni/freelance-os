// tests/integration/application/invoices/workspace-invoice-list.test.ts
import { WorkspaceInvoiceService } from "@/application/invoices/workspace-invoice-service";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma, repositories, runInTransaction } from "../../persistence/helpers";

describe("WorkspaceInvoiceService.listInvoicesForWorkspace (integration)", () => {
  let contextA: WorkspaceContext;
  let contextB: WorkspaceContext;
  let service: WorkspaceInvoiceService;
  let clientAId: string;
  let contractAId: string;
  let contractA2Id: string;
  let foreignClientId: string;

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Workspace" CASCADE');

    service = new WorkspaceInvoiceService(
      repositories.invoices,
      repositories.payments,
      repositories.clients,
      repositories.contracts,
    );

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
    clientAId = clientA.id;

    const clientA2 = await repositories.clients.createClient(contextA.workspaceId, {
      companyName: "Client A2",
      status: "ACTIVE",
    });

    const contractA = await repositories.contracts.createContract(contextA.workspaceId, {
      clientId: clientA.id,
      validFrom: new Date("2026-01-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "100.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
    commitmentPercentage: 60,
    allocatedMinutes: null,
      paymentTermsDays: 30,
    });
    contractAId = contractA.id;

    const contractA2 = await repositories.contracts.createContract(contextA.workspaceId, {
      clientId: clientA2.id,
      validFrom: new Date("2026-01-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "120.0000",
      currency: "USD",
      commitmentMode: "PERCENTAGE",
    commitmentPercentage: 60,
    allocatedMinutes: null,
      paymentTermsDays: 30,
    });
    contractA2Id = contractA2.id;

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

    const foreignClient = await repositories.clients.createClient(contextB.workspaceId, {
      companyName: "Foreign Client",
      status: "ACTIVE",
    });
    foreignClientId = foreignClient.id;
  });

  it("isolates invoices by workspace", async () => {
    await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractAId,
      invoiceDate: new Date("2026-10-05"),
      amount: "1000.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: new Date("2026-11-04"),
    });

    await expect(service.listInvoicesForWorkspace(contextB)).resolves.toEqual([]);
  });

  it("filters by period on invoiceDate", async () => {
    await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractAId,
      invoiceDate: new Date("2026-01-15"),
      amount: "100.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: new Date("2026-02-14"),
    });
    await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractAId,
      invoiceDate: new Date("2026-03-15"),
      amount: "200.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: new Date("2026-04-14"),
    });

    const rows = await service.listInvoicesForWorkspace(contextA, {
      period: {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      },
    });

    expect(rows.map((row) => row.amount)).toEqual(["100.0000"]);
  });

  it("filters by client and tracking state", async () => {
    const active = await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractAId,
      invoiceDate: new Date("2026-10-01"),
      amount: "100.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: new Date("2026-10-31"),
    });
    const voided = await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractAId,
      invoiceDate: new Date("2026-10-02"),
      amount: "200.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: new Date("2026-11-01"),
    });
    await repositories.invoices.voidInvoice(contextA.workspaceId, voided.id);

    await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractA2Id,
      invoiceDate: new Date("2026-10-03"),
      amount: "300.0000",
      currency: "USD",
      paymentTermsDays: 30,
      dueDate: new Date("2026-11-02"),
    });

    const activeForClient = await service.listInvoicesForWorkspace(contextA, {
      clientId: clientAId,
      tracking: "ACTIVE",
    });
    expect(activeForClient.map((row) => row.id)).toEqual([active.id]);

    const voidOnly = await service.listInvoicesForWorkspace(contextA, {
      clientId: clientAId,
      tracking: "VOID",
    });
    expect(voidOnly.map((row) => row.id)).toEqual([voided.id]);
  });

  it("orders newest invoice first and keeps currencies separate", async () => {
    const older = await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractAId,
      invoiceDate: new Date("2026-09-01"),
      amount: "100.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: new Date("2026-10-01"),
    });
    const newer = await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractA2Id,
      invoiceDate: new Date("2026-10-01"),
      amount: "200.0000",
      currency: "USD",
      paymentTermsDays: 30,
      dueDate: new Date("2026-10-31"),
    });

    const rows = await service.listInvoicesForWorkspace(contextA);
    expect(rows.map((row) => row.id)).toEqual([newer.id, older.id]);
    expect(rows.map((row) => row.currency)).toEqual(["USD", "EUR"]);
  });

  it("rejects foreign workspace client filter", async () => {
    await expect(
      service.listInvoicesForWorkspace(contextA, { clientId: foreignClientId }),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it("combines client filter with payment-derived amountStatus", async () => {
    const unpaid = await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractAId,
      invoiceDate: new Date("2026-10-05"),
      amount: "1000.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: new Date("2026-11-04"),
    });
    const paid = await repositories.invoices.createInvoice(contextA.workspaceId, {
      contractId: contractAId,
      invoiceDate: new Date("2026-10-06"),
      amount: "500.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: new Date("2026-11-05"),
    });
    await repositories.payments.createPayment(contextA.workspaceId, {
      invoiceId: paid.id,
      paymentDate: new Date("2026-10-10"),
      amount: "500.0000",
      currency: "EUR",
    });

    const rows = await service.listInvoicesForWorkspace(contextA, {
      clientId: clientAId,
      amountStatus: "PAID",
    });

    expect(rows.map((row) => row.id)).toEqual([paid.id]);
    expect(rows[0]?.clientName).toBe("Client A");
    expect(unpaid.id).not.toEqual(paid.id);
  });
});
