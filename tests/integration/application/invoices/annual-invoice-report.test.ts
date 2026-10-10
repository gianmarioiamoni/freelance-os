// tests/integration/application/invoices/annual-invoice-report.test.ts
import { AnnualInvoiceReportService } from "@/application/invoices/annual-invoice-report";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma, repositories, runInTransaction } from "../../persistence/helpers";

describe("AnnualInvoiceReportService (integration)", () => {
  let workspaceAContext: WorkspaceContext;
  let workspaceBContext: WorkspaceContext;
  let contractAId: string;
  let contractBId: string;
  let service: AnnualInvoiceReportService;

  beforeEach(async () => {
    await prisma.$executeRawUnsafe("TRUNCATE TABLE \"Workspace\" CASCADE");

    service = new AnnualInvoiceReportService(
      repositories.invoices,
      repositories.payments,
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
      await repositories.invoices.createInvoice(workspaceBContext.workspaceId, {
        contractId: contractBId,
        invoiceDate: new Date("2026-03-15"),
        amount: "5000.0000",
        currency: "USD",
        paymentTermsDays: 30,
        dueDate: new Date("2026-04-14"),
      });

      const report = await service.getAnnualInvoiceReport(workspaceAContext, 2026);

      expect(report.invoices).toEqual([]);
      expect(report.payments).toEqual([]);
      expect(report.totalCollectedByCurrency).toEqual([]);
    });
  });

  describe("invoice filtering by year", () => {
    it("includes only invoices issued in selected year", async () => {
      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractAId,
        invoiceDate: new Date("2025-12-31"),
        amount: "1000.0000",
        currency: "EUR",
        paymentTermsDays: 30,
        dueDate: new Date("2026-01-30"),
      });

      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractAId,
        invoiceDate: new Date("2026-01-01"),
        amount: "2000.0000",
        currency: "EUR",
        paymentTermsDays: 30,
        dueDate: new Date("2026-01-31"),
      });

      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractAId,
        invoiceDate: new Date("2026-12-31"),
        amount: "3000.0000",
        currency: "EUR",
        paymentTermsDays: 30,
        dueDate: new Date("2027-01-30"),
      });

      await repositories.invoices.createInvoice(workspaceAContext.workspaceId, {
        contractId: contractAId,
        invoiceDate: new Date("2027-01-01"),
        amount: "4000.0000",
        currency: "EUR",
        paymentTermsDays: 30,
        dueDate: new Date("2027-01-31"),
      });

      const report = await service.getAnnualInvoiceReport(workspaceAContext, 2026);

      expect(report.invoices).toHaveLength(2);
      expect(report.invoices.map((i) => i.amount).sort()).toEqual(["2000.0000", "3000.0000"]);
    });
  });

  describe("payment filtering by paymentDate", () => {
    it("includes payments collected in year regardless of invoice date", async () => {
      const invoice2025 = await repositories.invoices.createInvoice(
        workspaceAContext.workspaceId,
        {
          contractId: contractAId,
          invoiceDate: new Date("2025-11-01"),
          amount: "1000.0000",
          currency: "EUR",
          paymentTermsDays: 30,
          dueDate: new Date("2025-12-01"),
        },
      );

      const invoice2026 = await repositories.invoices.createInvoice(
        workspaceAContext.workspaceId,
        {
          contractId: contractAId,
          invoiceDate: new Date("2026-02-01"),
          amount: "500.0000",
          currency: "EUR",
          paymentTermsDays: 30,
          dueDate: new Date("2026-03-03"),
        },
      );

      // Payment in 2025 for 2025 invoice
      await repositories.payments.createPayment(workspaceAContext.workspaceId, {
        invoiceId: invoice2025.id,
        paymentDate: new Date("2025-12-15"),
        amount: "500.0000",
        currency: "EUR",
      });

      // Payment in 2026 for 2025 invoice
      await repositories.payments.createPayment(workspaceAContext.workspaceId, {
        invoiceId: invoice2025.id,
        paymentDate: new Date("2026-01-10"),
        amount: "500.0000",
        currency: "EUR",
      });

      // Payment in 2026 for 2026 invoice
      await repositories.payments.createPayment(workspaceAContext.workspaceId, {
        invoiceId: invoice2026.id,
        paymentDate: new Date("2026-03-15"),
        amount: "250.0000",
        currency: "EUR",
      });

      // Payment in 2027 for 2026 invoice
      await repositories.payments.createPayment(workspaceAContext.workspaceId, {
        invoiceId: invoice2026.id,
        paymentDate: new Date("2027-01-05"),
        amount: "250.0000",
        currency: "EUR",
      });

      const report = await service.getAnnualInvoiceReport(workspaceAContext, 2026);

      // Only 2026 invoice in invoice list
      expect(report.invoices).toHaveLength(1);
      expect(report.invoices[0].invoiceId).toBe(invoice2026.id);

      // Two payments collected in 2026 (one for 2025 invoice, one for 2026 invoice)
      expect(report.payments).toHaveLength(2);
      expect(report.payments.map((p) => p.amount)).toEqual(["500.0000", "250.0000"]);

      // Total collected in 2026
      expect(report.totalCollectedByCurrency).toEqual([
        { currency: "EUR", amount: "750.0000" },
      ]);
    });
  });

  describe("currency separation", () => {
    it("keeps EUR and USD separate", async () => {
      const clientUSD = await repositories.clients.createClient(
        workspaceAContext.workspaceId,
        {
          companyName: "Client USD",
          status: "ACTIVE",
        },
      );

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

      const invoiceEUR = await repositories.invoices.createInvoice(
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

      const invoiceUSD = await repositories.invoices.createInvoice(
        workspaceAContext.workspaceId,
        {
          contractId: contractUSD.id,
          invoiceDate: new Date("2026-01-16"),
          amount: "500.0000",
          currency: "USD",
          paymentTermsDays: 30,
          dueDate: new Date("2026-02-15"),
        },
      );

      await repositories.payments.createPayment(workspaceAContext.workspaceId, {
        invoiceId: invoiceEUR.id,
        paymentDate: new Date("2026-02-20"),
        amount: "600.0000",
        currency: "EUR",
      });

      await repositories.payments.createPayment(workspaceAContext.workspaceId, {
        invoiceId: invoiceUSD.id,
        paymentDate: new Date("2026-02-25"),
        amount: "250.0000",
        currency: "USD",
      });

      const report = await service.getAnnualInvoiceReport(workspaceAContext, 2026);

      expect(report.totalCollectedByCurrency).toEqual([
        { currency: "EUR", amount: "600.0000" },
        { currency: "USD", amount: "250.0000" },
      ]);
    });
  });

  describe("VOID invoice handling", () => {
    it("excludes VOID invoices and their payments", async () => {
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

      const voidInvoice = await repositories.invoices.createInvoice(
        workspaceAContext.workspaceId,
        {
          contractId: contractAId,
          invoiceDate: new Date("2026-02-01"),
          amount: "2000.0000",
          currency: "EUR",
          paymentTermsDays: 30,
          dueDate: new Date("2026-03-03"),
        },
      );

      await repositories.invoices.voidInvoice(
        workspaceAContext.workspaceId,
        voidInvoice.id,
      );

      await repositories.payments.createPayment(workspaceAContext.workspaceId, {
        invoiceId: activeInvoice.id,
        paymentDate: new Date("2026-02-20"),
        amount: "500.0000",
        currency: "EUR",
      });

      await repositories.payments.createPayment(workspaceAContext.workspaceId, {
        invoiceId: voidInvoice.id,
        paymentDate: new Date("2026-03-15"),
        amount: "1000.0000",
        currency: "EUR",
      });

      const report = await service.getAnnualInvoiceReport(workspaceAContext, 2026);

      // Only ACTIVE invoice
      expect(report.invoices).toHaveLength(1);
      expect(report.invoices[0].invoiceId).toBe(activeInvoice.id);

      // Only payment for ACTIVE invoice
      expect(report.payments).toHaveLength(1);
      expect(report.payments[0].invoiceId).toBe(activeInvoice.id);

      // Total excludes VOID payment
      expect(report.totalCollectedByCurrency).toEqual([
        { currency: "EUR", amount: "500.0000" },
      ]);
    });
  });
});
