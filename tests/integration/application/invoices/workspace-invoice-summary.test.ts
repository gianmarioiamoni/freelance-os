// tests/integration/application/invoices/workspace-invoice-summary.test.ts
import { WorkspaceInvoiceService } from "@/application/invoices/workspace-invoice-service";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma, repositories, runInTransaction } from "../../persistence/helpers";

describe("WorkspaceInvoiceService (integration)", () => {
  let workspaceAContext: WorkspaceContext;
  let workspaceBContext: WorkspaceContext;
  let contractAId: string;
  let contractBId: string;
  let service: WorkspaceInvoiceService;

  beforeEach(async () => {
    await prisma.$executeRawUnsafe("TRUNCATE TABLE \"Workspace\" CASCADE");

    service = new WorkspaceInvoiceService(
      repositories.invoices,
      repositories.payments,
      repositories.clients,
      repositories.contracts,
    );

    // Workspace A
    const workspaceA = await createFirstWorkspace(
      "user-a",
      { name: "Workspace A", timezone: "Europe/Rome", currency: "EUR" },
      { runInTransaction },
    );
    workspaceAContext = {
      workspaceId: workspaceA.workspace.id,
      userId: workspaceA.membership.userId,
      role: workspaceA.membership.role,
      timezone: "Europe/Rome",
    };

    const clientA = await repositories.clients.createClient(workspaceA.workspace.id, {
      companyName: "Client A",
      status: "ACTIVE",
    });

    const contractA = await repositories.contracts.createContract(workspaceA.workspace.id, {
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

    // Workspace B
    const workspaceB = await createFirstWorkspace(
      "user-b",
      { name: "Workspace B", timezone: "America/New_York", currency: "USD" },
      { runInTransaction },
    );
    workspaceBContext = {
      workspaceId: workspaceB.workspace.id,
      userId: workspaceB.membership.userId,
      role: workspaceB.membership.role,
      timezone: "America/New_York",
    };

    const clientB = await repositories.clients.createClient(workspaceB.workspace.id, {
      companyName: "Client B",
      status: "ACTIVE",
    });

    const contractB = await repositories.contracts.createContract(workspaceB.workspace.id, {
      clientId: clientB.id,
      validFrom: new Date("2026-01-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "150.0000",
      currency: "USD",
      commitmentMode: "PERCENTAGE",
    commitmentPercentage: 60,
    allocatedMinutes: null,
      paymentTermsDays: 30,
    });
    contractBId = contractB.id;
  });

  describe("workspace isolation", () => {
    it("workspace A cannot see workspace B invoices", async () => {
      // Create invoice in Workspace B
      await repositories.invoices.createInvoice(workspaceBContext.workspaceId, {
        contractId: contractBId,
        invoiceDate: new Date("2026-01-15"),
        amount: "5000.0000",
        currency: "USD",
        paymentTermsDays: 30,
        dueDate: new Date("2026-02-14"),
      });

      // Query from Workspace A
      const summary = await service.getWorkspaceInvoiceSummary(workspaceAContext);

      expect(summary.invoicedByCurrency).toEqual([]);
      expect(summary.paidByCurrency).toEqual([]);
      expect(summary.outstandingByCurrency).toEqual([]);
    });

    it("workspace B cannot see workspace A invoices", async () => {
      // Create invoice in Workspace A
      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractAId,
        invoiceDate: new Date("2026-01-15"),
        amount: "3000.0000",
        currency: "EUR",
        paymentTermsDays: 30,
        dueDate: new Date("2026-02-14"),
      });

      // Query from Workspace B
      const summary = await service.getWorkspaceInvoiceSummary(workspaceBContext);

      expect(summary.invoicedByCurrency).toEqual([]);
      expect(summary.paidByCurrency).toEqual([]);
      expect(summary.outstandingByCurrency).toEqual([]);
    });
  });

  describe("currency separation", () => {
    it("keeps EUR and USD separate", async () => {
      

      // Create EUR invoice
      const eurInvoice = await repositories.invoices.createInvoice(
        workspaceAContext.workspaceId,
        {
          contractId: contractAId,
          invoiceDate: new Date("2026-01-15"),
          amount: "1000.0000",
          currency: "EUR",
          paymentTermsDays: 30,
          dueDate: new Date("2026-02-14"),
        },
      );

      // Create USD contract and invoice in same workspace
      const clientUSD = await repositories.clients.createClient(workspaceAContext.workspaceId, {
        companyName: "Client USD",
        status: "ACTIVE",
      });

      const contractUSD = await repositories.contracts.createContract(
        workspaceAContext.workspaceId,
        {
          clientId: clientUSD.id,
          validFrom: new Date("2026-01-01"),
          validTo: null,
          billingModel: "HOURLY",
          rate: "120.0000",
          currency: "USD",
          commitmentMode: "PERCENTAGE",
    commitmentPercentage: 60,
    allocatedMinutes: null,
          paymentTermsDays: 30,
        },
      );

      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractUSD.id,
        invoiceDate: new Date("2026-01-16"),
        amount: "500.0000",
        currency: "USD",
        paymentTermsDays: 30,
        dueDate: new Date("2026-02-15"),
      });

      // Add payment to EUR invoice
      await repositories.payments.createPayment(workspaceAContext.workspaceId, {
        invoiceId: eurInvoice.id,
        paymentDate: new Date("2026-01-20"),
        amount: "600.0000",
        currency: "EUR",
      });

      const summary = await service.getWorkspaceInvoiceSummary(workspaceAContext);

      // Verify no mixed-currency totals
      expect(summary.invoicedByCurrency).toEqual([
        { currency: "EUR", amount: "1000.0000" },
        { currency: "USD", amount: "500.0000" },
      ]);

      expect(summary.paidByCurrency).toEqual([
        { currency: "EUR", amount: "600.0000" },
      ]);

      expect(summary.outstandingByCurrency).toEqual([
        { currency: "EUR", amount: "400.0000" },
        { currency: "USD", amount: "500.0000" },
      ]);
    });
  });

  describe("VOID exclusion", () => {
    it("excludes VOID invoices from all totals", async () => {
      

      // Create ACTIVE invoice
      const activeInvoice = await repositories.invoices.createInvoice(
        workspaceAContext.workspaceId,
        {
          contractId: contractAId,
          invoiceDate: new Date("2026-01-15"),
          amount: "1000.0000",
          currency: "EUR",
          paymentTermsDays: 30,
          dueDate: new Date("2026-02-14"),
        },
      );

      // Create and VOID another invoice
      const voidInvoice = await repositories.invoices.createInvoice(
        workspaceAContext.workspaceId,
        {
          contractId: contractAId,
          invoiceDate: new Date("2026-01-20"),
          amount: "2000.0000",
          currency: "EUR",
          paymentTermsDays: 30,
          dueDate: new Date("2026-02-19"),
        },
      );
      await repositories.invoices.voidInvoice(
        workspaceAContext.workspaceId,
        voidInvoice.id,
      );

      // Add payment to ACTIVE invoice
      await repositories.payments.createPayment(workspaceAContext.workspaceId, {
        invoiceId: activeInvoice.id,
        paymentDate: new Date("2026-01-25"),
        amount: "500.0000",
        currency: "EUR",
      });

      const summary = await service.getWorkspaceInvoiceSummary(workspaceAContext);

      // Only ACTIVE invoice should be counted
      expect(summary.invoicedByCurrency).toEqual([
        { currency: "EUR", amount: "1000.0000" },
      ]);
      expect(summary.paidByCurrency).toEqual([
        { currency: "EUR", amount: "500.0000" },
      ]);
      expect(summary.outstandingByCurrency).toEqual([
        { currency: "EUR", amount: "500.0000" },
      ]);
    });
  });

  describe("period scope", () => {
    it("filters invoices by period", async () => {
      

      // Invoice in January
      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractAId,
        invoiceDate: new Date("2026-01-15"),
        amount: "1000.0000",
        currency: "EUR",
        paymentTermsDays: 30,
        dueDate: new Date("2026-02-14"),
      });

      // Invoice in February
      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractAId,
        invoiceDate: new Date("2026-02-20"),
        amount: "2000.0000",
        currency: "EUR",
        paymentTermsDays: 30,
        dueDate: new Date("2026-03-22"),
      });

      // Query January only
      const summary = await service.getWorkspaceInvoiceSummary(workspaceAContext, {
        period: {
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-01-31"),
        },
      });

      expect(summary.invoicedByCurrency).toEqual([
        { currency: "EUR", amount: "1000.0000" },
      ]);
    });

    it("returns all invoices when no period specified", async () => {
      

      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractAId,
        invoiceDate: new Date("2026-01-15"),
        amount: "1000.0000",
        currency: "EUR",
        paymentTermsDays: 30,
        dueDate: new Date("2026-02-14"),
      });

      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractAId,
        invoiceDate: new Date("2026-06-20"),
        amount: "2000.0000",
        currency: "EUR",
        paymentTermsDays: 30,
        dueDate: new Date("2026-07-20"),
      });

      const summary = await service.getWorkspaceInvoiceSummary(workspaceAContext);

      expect(summary.invoicedByCurrency).toEqual([
        { currency: "EUR", amount: "3000.0000" },
      ]);
    });
  });

  describe("overdue count", () => {
    it("counts unpaid overdue invoices", async () => {
      

      // Overdue invoice
      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractAId,
        invoiceDate: new Date("2025-12-01"),
        amount: "1000.0000",
        currency: "EUR",
        paymentTermsDays: 30,
        dueDate: new Date("2025-12-31"),
      });

      // Not yet due
      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractAId,
        invoiceDate: new Date("2026-10-01"),
        amount: "2000.0000",
        currency: "EUR",
        paymentTermsDays: 30,
        dueDate: new Date("2026-10-31"),
      });

      const summary = await service.getWorkspaceInvoiceSummary(workspaceAContext);

      expect(summary.overdueCount).toBe(1);
    });
  });
});
