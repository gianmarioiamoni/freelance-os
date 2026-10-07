// tests/unit/application/invoices/workspace-invoice-service.test.ts
import { WorkspaceInvoiceService } from "@/application/invoices/workspace-invoice-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { InvoiceRecord, PaymentRecord } from "@/domain/persistence-types";
import type { InvoiceRepository, PaymentRepository } from "@/domain/repositories";
import { describe, it, expect, beforeEach } from "vitest";

describe("WorkspaceInvoiceService", () => {
  let service: WorkspaceInvoiceService;
  let mockInvoices: InvoiceRepository;
  let mockPayments: PaymentRepository;
  let context: WorkspaceContext;

  beforeEach(() => {
    context = {
      workspaceId: "workspace-1",
      userId: "user-1",
      role: "OWNER",
      timezone: "Europe/Rome",
    };

    mockInvoices = {
      listInvoicesForWorkspace: async () => [],
    } as unknown as InvoiceRepository;

    mockPayments = {
      listPaymentsForInvoice: async () => [],
    } as unknown as PaymentRepository;

    service = new WorkspaceInvoiceService(mockInvoices, mockPayments);
  });

  describe("getWorkspaceInvoiceSummary", () => {
    it("returns zero amounts for empty workspace", async () => {
      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.invoicedByCurrency).toEqual([]);
      expect(summary.paidByCurrency).toEqual([]);
      expect(summary.outstandingByCurrency).toEqual([]);
      expect(summary.overdueCount).toBe(0);
    });

    it("separates EUR and USD invoiced amounts", async () => {
      const invoices: InvoiceRecord[] = [
        createInvoice("inv-1", "1000.5000", "EUR"),
        createInvoice("inv-2", "2000.0000", "EUR"),
        createInvoice("inv-3", "500.0000", "USD"),
      ];

      mockInvoices.listInvoicesForWorkspace = async () => invoices;

      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.invoicedByCurrency).toEqual([
        { currency: "EUR", amount: "3000.5000" },
        { currency: "USD", amount: "500.0000" },
      ]);
    });

    it("separates EUR and USD paid amounts", async () => {
      const invoices: InvoiceRecord[] = [
        createInvoice("inv-1", "1000.0000", "EUR"),
        createInvoice("inv-2", "500.0000", "USD"),
      ];

      mockInvoices.listInvoicesForWorkspace = async () => invoices;
      mockPayments.listPaymentsForInvoice = async (_, invoiceId) => {
        if (invoiceId === "inv-1") {
          return [createPayment("pay-1", "600.0000", "EUR")];
        }
        if (invoiceId === "inv-2") {
          return [createPayment("pay-2", "200.0000", "USD")];
        }
        return [];
      };

      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.paidByCurrency).toEqual([
        { currency: "EUR", amount: "600.0000" },
        { currency: "USD", amount: "200.0000" },
      ]);
    });

    it("computes outstanding per currency", async () => {
      const invoices: InvoiceRecord[] = [
        createInvoice("inv-1", "1000.0000", "EUR"),
        createInvoice("inv-2", "500.0000", "USD"),
      ];

      mockInvoices.listInvoicesForWorkspace = async () => invoices;
      mockPayments.listPaymentsForInvoice = async (_, invoiceId) => {
        if (invoiceId === "inv-1") {
          return [createPayment("pay-1", "600.0000", "EUR")];
        }
        return [];
      };

      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.outstandingByCurrency).toEqual([
        { currency: "EUR", amount: "400.0000" },
        { currency: "USD", amount: "500.0000" },
      ]);
    });

    it("excludes fully paid invoices from outstanding", async () => {
      const invoices: InvoiceRecord[] = [
        createInvoice("inv-1", "1000.0000", "EUR"),
      ];

      mockInvoices.listInvoicesForWorkspace = async () => invoices;
      mockPayments.listPaymentsForInvoice = async () => [
        createPayment("pay-1", "1000.0000", "EUR"),
      ];

      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.outstandingByCurrency).toEqual([]);
    });

    it("excludes VOID invoices from all totals", async () => {
      const activeInvoices: InvoiceRecord[] = [
        createInvoice("inv-1", "1000.0000", "EUR"),
      ];

      mockInvoices.listInvoicesForWorkspace = async (_, filter) => {
        // Verify ACTIVE filter is requested
        expect(filter?.tracking).toBe("ACTIVE");
        return activeInvoices;
      };

      await service.getWorkspaceInvoiceSummary(context);
    });

    it("filters by period when provided", async () => {
      const period = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      };

      mockInvoices.listInvoicesForWorkspace = async (_, filter) => {
        expect(filter?.period).toEqual(period);
        return [];
      };

      await service.getWorkspaceInvoiceSummary(context, { period });
    });

    it("counts overdue invoices", async () => {
      const invoices: InvoiceRecord[] = [
        {
          ...createInvoice("inv-1", "1000.0000", "EUR"),
          dueDate: new Date("2026-01-01"), // Past due
        },
        {
          ...createInvoice("inv-2", "500.0000", "EUR"),
          dueDate: new Date("2026-12-31"), // Not due yet
        },
      ];

      mockInvoices.listInvoicesForWorkspace = async () => invoices;
      mockPayments.listPaymentsForInvoice = async () => []; // Unpaid

      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.overdueCount).toBe(1);
    });

    it("does not count paid invoices as overdue", async () => {
      const invoices: InvoiceRecord[] = [
        {
          ...createInvoice("inv-1", "1000.0000", "EUR"),
          dueDate: new Date("2026-01-01"), // Past due but paid
        },
      ];

      mockInvoices.listInvoicesForWorkspace = async () => invoices;
      mockPayments.listPaymentsForInvoice = async () => [
        createPayment("pay-1", "1000.0000", "EUR"),
      ];

      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.overdueCount).toBe(0);
    });

    it("does not count invoices without due date as overdue", async () => {
      const invoices: InvoiceRecord[] = [
        {
          ...createInvoice("inv-1", "1000.0000", "EUR"),
          dueDate: null, // No payment terms
        },
      ];

      mockInvoices.listInvoicesForWorkspace = async () => invoices;
      mockPayments.listPaymentsForInvoice = async () => [];

      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.overdueCount).toBe(0);
    });

    it("handles multiple payments per invoice", async () => {
      const invoices: InvoiceRecord[] = [
        createInvoice("inv-1", "1000.0000", "EUR"),
      ];

      mockInvoices.listInvoicesForWorkspace = async () => invoices;
      mockPayments.listPaymentsForInvoice = async () => [
        createPayment("pay-1", "300.0000", "EUR"),
        createPayment("pay-2", "400.0000", "EUR"),
      ];

      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.paidByCurrency).toEqual([
        { currency: "EUR", amount: "700.0000" },
      ]);
      expect(summary.outstandingByCurrency).toEqual([
        { currency: "EUR", amount: "300.0000" },
      ]);
    });

    it("handles decimal precision correctly", async () => {
      const invoices: InvoiceRecord[] = [
        createInvoice("inv-1", "1234.5678", "EUR"),
      ];

      mockInvoices.listInvoicesForWorkspace = async () => invoices;
      mockPayments.listPaymentsForInvoice = async () => [
        createPayment("pay-1", "234.5678", "EUR"),
      ];

      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.invoicedByCurrency).toEqual([
        { currency: "EUR", amount: "1234.5678" },
      ]);
      expect(summary.paidByCurrency).toEqual([
        { currency: "EUR", amount: "234.5678" },
      ]);
      expect(summary.outstandingByCurrency).toEqual([
        { currency: "EUR", amount: "1000.0000" },
      ]);
    });
  });
});

function createInvoice(
  id: string,
  amount: string,
  currency: string,
): InvoiceRecord {
  return {
    id,
    workspaceId: "workspace-1",
    contractId: "contract-1",
    invoiceDate: new Date("2026-01-15"),
    amount,
    currency,
    reference: null,
    paymentTermsDays: 30,
    dueDate: new Date("2026-02-14"),
    voidedAt: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  };
}

function createPayment(
  id: string,
  amount: string,
  currency: string,
): PaymentRecord {
  return {
    id,
    workspaceId: "workspace-1",
    invoiceId: "inv-1",
    paymentDate: new Date("2026-01-20"),
    amount,
    currency,
    notes: null,
    createdAt: new Date("2026-01-20T10:00:00Z"),
    updatedAt: new Date("2026-01-20T10:00:00Z"),
  };
}
